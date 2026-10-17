import { ensureWorkerRunning, sql } from "./helpers";

/**
 * Removes every `e2e-%` article fixture (plus its revisions, audit rows, and
 * outbox events) and the staff fixtures the scenario spec creates, so the dev
 * site returns to its seeded state. Also makes sure the outbox worker is left
 * running (the recovery test stops and restarts it). Best-effort: never fails
 * the suite because cleanup could not run.
 */
export default async function globalTeardown() {
  try {
    sql(`
      DELETE FROM audit_logs WHERE resource_id IN (SELECT id::text FROM articles WHERE slug LIKE 'e2e-%');
      DELETE FROM outbox_events WHERE aggregate_id IN (SELECT id::text FROM articles WHERE slug LIKE 'e2e-%');
      DELETE FROM articles WHERE slug LIKE 'e2e-%';
      DELETE FROM users WHERE email IN ('writer@srh.local', 'publisher@srh.local');
    `);
    console.log("[e2e] teardown removed e2e fixtures");
  } catch (err) {
    console.warn(`[e2e] teardown skipped: ${String(err).slice(0, 200)}`);
  }
  try {
    ensureWorkerRunning();
    console.log("[e2e] worker is running");
  } catch (err) {
    console.warn(`[e2e] worker check failed: ${String(err).slice(0, 200)}`);
  }
}
