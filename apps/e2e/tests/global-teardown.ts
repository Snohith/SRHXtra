import { execSync } from "node:child_process";

/**
 * Removes every `e2e-%` article fixture (plus its revisions, audit rows, and
 * outbox events) after the run, so the dev site returns to its seeded state.
 * Best-effort: never fails the suite because cleanup could not run.
 */
export default async function globalTeardown() {
  const container = process.env.CONTAINER ?? "srh-news-db";
  const user = process.env.DB_USER ?? "srh";
  const db = process.env.DB_NAME ?? "srh_news";
  const sql = `
    DELETE FROM audit_logs WHERE resource_id IN (SELECT id::text FROM articles WHERE slug LIKE 'e2e-%');
    DELETE FROM outbox_events WHERE aggregate_id IN (SELECT id::text FROM articles WHERE slug LIKE 'e2e-%');
    DELETE FROM articles WHERE slug LIKE 'e2e-%';
  `;
  try {
    execSync(
      `docker exec -i ${container} psql -U ${user} -d ${db} -v ON_ERROR_STOP=1 -q`,
      {
        input: sql,
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
    console.log("[e2e] teardown removed e2e fixtures");
  } catch (err) {
    console.warn(`[e2e] teardown skipped: ${String(err).slice(0, 200)}`);
  }
}
