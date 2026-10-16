/**
 * Minimal SQL migrator (no ORM).
 * - Applies apps/api/migrations/*.sql in filename order.
 * - Tracks applied files in schema_migrations(filename PK).
 * - Safe to re-run (migrations themselves must be idempotent where possible).
 *
 * Usage: pnpm --filter @srh/api db:migrate
 * Env: DATABASE_URL (falls back to local dev default for convenience).
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "migrations");
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://srh:srh_dev_password@localhost:5432/srh_news";

async function main() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows: applied } = await client.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set(applied.map((r) => r.filename));

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    if (files.length === 0) {
      console.log("No migrations found.");
      return;
    }
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply ${file} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`done  ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
