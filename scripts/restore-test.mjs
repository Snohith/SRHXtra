#!/usr/bin/env node
/**
 * Recovery test: restore the latest backup into a throwaway database and
 * verify it matches the source. This is the "can we actually recover?" drill —
 * it runs the full pg_restore path, compares row counts and content samples,
 * prints a PASS/FAIL report with timings, and drops the temp database.
 *
 * Usage:
 *   pnpm restore:test                    # uses newest backups/*.dump
 *   pnpm restore:test --file backups/x.dump
 *
 * Env: CONTAINER (srh-news-db) DB_USER (srh) DB_NAME (srh_news) BACKUP_DIR
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const container = process.env.CONTAINER ?? "srh-news-db";
const user = process.env.DB_USER ?? process.env.POSTGRES_USER ?? "srh";
const db = process.env.DB_NAME ?? process.env.POSTGRES_DB ?? "srh_news";
const dir = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");
const mediaDriver = process.env.MEDIA_DRIVER ?? "local";

function log(level, msg, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "restore-test",
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

function psql(database, sql, { tuplesOnly = true } = {}) {
  const args = ["exec", container, "psql", "-U", user, "-d", database];
  if (tuplesOnly) args.push("-t", "-A");
  args.push("-c", sql);
  const res = spawnSync("docker", args, { encoding: "utf8" });
  if (res.status !== 0)
    throw new Error(
      `psql(${database}) failed: ${res.stderr.trim().slice(0, 300)}`,
    );
  return res.stdout.trim();
}

function psqlScript(database, sql) {
  const res = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      user,
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    {
      input: sql,
      encoding: "utf8",
    },
  );
  if (res.status !== 0)
    throw new Error(`psql script failed: ${res.stderr.trim().slice(0, 300)}`);
  return res.stdout;
}

function latestBackup() {
  const fileArg = process.argv.indexOf("--file");
  if (fileArg !== -1 && process.argv[fileArg + 1])
    return process.argv[fileArg + 1];
  const files = readdirSync(dir)
    .filter((f) => /^srh_news_.*\.dump$/.test(f))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (files.length === 0)
    throw new Error(`No backups found in ${dir}. Run \`pnpm backup\` first.`);
  return files[0];
}

const TABLES = [
  "users",
  "roles",
  "user_roles",
  "categories",
  "articles",
  "article_revisions",
  "media_assets",
  "audit_logs",
  "outbox_events",
  "system_state",
  "media_upload_intents",
  "schema_migrations",
];

function count(database, table) {
  return psql(database, `SELECT COUNT(*) FROM ${table};`);
}

async function main() {
  const file = latestBackup();
  const tempDb = `srh_restore_test_${Date.now().toString(36)}`;
  log("info", "recovery drill starting", {
    file,
    tempDb,
    bytes: statSync(file).size,
  });

  psql("postgres", `CREATE DATABASE ${tempDb};`, { tuplesOnly: false });

  try {
    // 1. Restore the dump (full pg_restore path, no shortcuts).
    const restoreStart = Date.now();
    const res = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        container,
        "pg_restore",
        "-U",
        user,
        "-d",
        tempDb,
        "--no-owner",
      ],
      { input: readFileSync(file), encoding: "utf8" },
    );
    if (res.status !== 0) {
      throw new Error(
        `pg_restore exited ${res.status}: ${res.stderr.trim().slice(0, 400)}`,
      );
    }
    const restoreMs = Date.now() - restoreStart;

    // 2. Compare every table against the live database.
    const checks = [];
    let allOk = true;
    for (const table of TABLES) {
      const source = count(db, table);
      const restored = count(tempDb, table);
      const ok = source === restored;
      allOk = allOk && ok;
      checks.push({ table, source, restored, ok });
    }

    // 3. Content samples: latest published slug and newest audit action must survive.
    const sourceSlug = psql(
      db,
      "SELECT slug FROM articles WHERE status='PUBLISHED' ORDER BY published_at DESC LIMIT 1;",
    );
    const restoredSlug = psql(
      tempDb,
      "SELECT slug FROM articles WHERE status='PUBLISHED' ORDER BY published_at DESC LIMIT 1;",
    );
    const slugOk = sourceSlug === restoredSlug && sourceSlug.length > 0;
    allOk = allOk && slugOk;
    const sourceAudit = psql(
      db,
      "SELECT action FROM audit_logs ORDER BY id DESC LIMIT 1;",
    );
    const restoredAudit = psql(
      tempDb,
      "SELECT action FROM audit_logs ORDER BY id DESC LIMIT 1;",
    );
    const auditOk = sourceAudit === restoredAudit;
    allOk = allOk && auditOk;

    // 4. Media: sampled media_assets rows must have files in the uploads
    // archive written next to this dump (S3 relies on the bucket instead).
    let media = { checked: 0, ok: true, note: "no media rows" };
    const mediaCount = Number(count(tempDb, "media_assets"));
    if (mediaCount > 0 && mediaDriver === "s3") {
      media = { checked: 0, ok: true, note: "skipped (MEDIA_DRIVER=s3)" };
    } else if (mediaCount > 0) {
      const stamp = basename(file)
        .replace(/^srh_news_/, "")
        .replace(/\.dump$/, "");
      const archive = join(dir, `uploads_${stamp}.tar.gz`);
      const keys = psql(
        tempDb,
        "SELECT storage_key FROM media_assets ORDER BY created_at DESC LIMIT 5;",
      )
        .split("\n")
        .filter(Boolean);
      if (!existsSync(archive)) {
        media = {
          checked: keys.length,
          ok: false,
          note: `missing ${basename(archive)}`,
        };
      } else {
        const extractDir = mkdtempSync(join(tmpdir(), "srh-media-"));
        try {
          execFileSync("tar", ["-xzf", archive, "-C", extractDir]);
          const missing = keys.filter(
            (key) => !existsSync(join(extractDir, key)),
          );
          media = { checked: keys.length, ok: missing.length === 0, missing };
        } finally {
          rmSync(extractDir, { recursive: true, force: true });
        }
      }
    }
    allOk = allOk && media.ok;

    for (const c of checks) {
      log("info", `table ${c.table}`, {
        source: c.source,
        restored: c.restored,
        ok: c.ok,
      });
    }
    log("info", "content samples", {
      latestPublishedSlug: { value: restoredSlug, ok: slugOk },
      latestAuditAction: { value: restoredAudit, ok: auditOk },
      media,
    });
    log(
      allOk ? "info" : "error",
      allOk ? "RECOVERY TEST PASSED" : "RECOVERY TEST FAILED",
      {
        restoreMs,
        totalMs: Date.now() - restoreStart,
        checks: checks.length,
      },
    );
    if (!allOk) process.exitCode = 1;
  } finally {
    psql("postgres", `DROP DATABASE IF EXISTS ${tempDb} WITH (FORCE);`, {
      tuplesOnly: false,
    });
  }
}

main().catch((err) => {
  log("error", "recovery drill failed", { error: err.message });
  process.exit(1);
});
