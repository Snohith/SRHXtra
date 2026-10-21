#!/usr/bin/env node
/**
 * Logical Postgres backup (custom format) + local media archive, with
 * integrity check + retention.
 *
 * Dumps the dev/prod container to backups/srh_news_<timestamp>.dump, archives
 * uploads/ to backups/uploads_<timestamp>.tar.gz (unless MEDIA_DRIVER=s3, where
 * the bucket's versioning/replication is the media backup), verifies the dump
 * is readable (pg_restore --list), prunes old backups, and logs a JSON summary.
 * Schedule with cron, e.g. hourly:
 *   0 * * * * cd <repo> && /usr/local/bin/pnpm backup >> logs/backup.log 2>&1
 *
 * Env: CONTAINER (srh-news-db) DB_USER (srh) DB_NAME (srh_news)
 *      BACKUP_DIR (<repo>/backups) BACKUP_KEEP (7) MEDIA_DRIVER (local|s3)
 *      UPLOADS_DIR (<repo>/uploads)
 */
import { execFileSync, spawn } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

const container = process.env.CONTAINER ?? "srh-news-db";
const user = process.env.DB_USER ?? process.env.POSTGRES_USER ?? "srh";
const db = process.env.DB_NAME ?? process.env.POSTGRES_DB ?? "srh_news";
const dir = process.env.BACKUP_DIR ?? join(process.cwd(), "backups");
// Clamp: NaN/0 would make slice(NaN)/slice(0) prune every backup.
const keep = Math.max(
  1,
  Number.parseInt(process.env.BACKUP_KEEP ?? "7", 10) || 7,
);
const uploads = (
  process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads")
).replace(/\/+$/, "");
const mediaDriver = process.env.MEDIA_DRIVER ?? "local";

function log(level, msg, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "backup",
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

async function pgDumpTo(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      ["exec", container, "pg_dump", "-U", user, "-d", db, "-Fc", "--no-owner"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const out = createWriteStream(file);
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.stdout.pipe(out);
    child.on("error", reject);
    child.on("close", (code) => {
      out.end(() => {
        if (code === 0) resolve();
        else
          reject(
            new Error(`pg_dump exited ${code}: ${stderr.trim().slice(0, 300)}`),
          );
      });
    });
  });
}

function verifyArchive(file) {
  const listing = execFileSync(
    "docker",
    ["exec", "-i", container, "pg_restore", "--list"],
    {
      input: readFileSync(file),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const tables = String(listing)
    .split("\n")
    .filter((line) => /TABLE DATA/.test(line)).length;
  if (tables < 1) throw new Error("Archive contains no table data entries.");
  return tables;
}

function archiveUploads(stamp) {
  if (mediaDriver === "s3") {
    // S3 objects are not on this disk; rely on bucket versioning/replication.
    return null;
  }
  if (!existsSync(uploads)) return null;
  const file = join(dir, `uploads_${stamp}.tar.gz`);
  execFileSync("tar", [
    "-czf",
    file,
    "-C",
    dirname(uploads),
    basename(uploads),
  ]);
  return file;
}

function prune(re) {
  const files = readdirSync(dir)
    .filter((f) => re.test(f))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const pruned = [];
  for (const f of files.slice(keep)) {
    unlinkSync(f);
    pruned.push(f.split("/").pop());
  }
  return pruned;
}

async function main() {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const file = join(dir, `srh_news_${stamp}.dump`);

  const startedAt = Date.now();
  await pgDumpTo(file);
  const tables = verifyArchive(file);
  const bytes = statSync(file).size;
  const mediaFile = archiveUploads(stamp);
  const mediaBytes = mediaFile ? statSync(mediaFile).size : 0;
  const pruned = [
    ...prune(/^srh_news_.*\.dump$/),
    ...prune(/^uploads_.*\.tar\.gz$/),
  ];
  log("info", "backup complete", {
    file,
    bytes,
    tables,
    mediaFile,
    mediaBytes,
    mediaDriver,
    durationMs: Date.now() - startedAt,
    pruned,
    kept: readdirSync(dir).filter((f) => f.endsWith(".dump")).length,
  });
}

main().catch((err) => {
  log("error", "backup failed", { error: err.message });
  process.exit(1);
});
