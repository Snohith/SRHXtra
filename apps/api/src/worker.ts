/**
 * Outbox worker (Step 5 — reliable publishing pipeline).
 *
 * The API's publish transaction writes an `outbox_events` row atomically with
 * the article status change. This standalone process is the only thing that
 * talks to the web tier:
 *
 *   pending event -> claim (FOR UPDATE SKIP LOCKED) -> POST revalidation webhook
 *   -> DONE on 2xx, else retry with backoff until max_attempts -> FAILED + alert
 *
 * Guarantees:
 * - At-least-once delivery; the webhook is idempotent (revalidatePath/Tag).
 * - No lost events: PROCESSING rows left behind by a crash are recovered.
 * - Heartbeat in system_state so /health and uptime checks can see it alive.
 *
 * Run (after `pnpm --filter @srh/api build`): node apps/api/dist/worker.js
 */
import "dotenv/config";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://srh:srh_dev_password@localhost:5432/srh_news";
const revalidateUrl =
  process.env.WEB_REVALIDATE_URL ?? "http://localhost:3000/api/revalidate";
const revalidateSecret =
  process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret";
const alertWebhook = process.env.ERROR_WEBHOOK_URL ?? "";
const pollMs = Math.max(Number(process.env.OUTBOX_POLL_MS ?? 2000), 250);
const HEARTBEAT_STALE_MS = 30_000;
const STUCK_AFTER_MS = 2 * 60_000;

const pool = new Pool({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 5000,
});
pool.on("error", (err) =>
  log("error", "pg pool error", { error: err.message }),
);

let shuttingDown = false;

function log(
  level: "info" | "warn" | "error",
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "outbox-worker",
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

async function alert(message: string, fields: Record<string, unknown> = {}) {
  log("error", message, fields);
  if (!alertWebhook) return;
  try {
    await fetch(alertWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "outbox-worker",
        message,
        ...fields,
        ts: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* alerting must never take the worker down */
  }
}

interface OutboxEvent {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

async function heartbeat() {
  await pool.query(
    `INSERT INTO system_state (key, value, updated_at)
     VALUES ('worker.heartbeat', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [
      JSON.stringify({
        pid: process.pid,
        pollMs,
        startedAt: startedAt.toISOString(),
      }),
    ],
  );
}

/** Requeue events whose processing lock went stale (worker crashed mid-flight). */
async function recoverStuck() {
  const { rowCount } = await pool.query(
    `UPDATE outbox_events
     SET status = 'PENDING', available_at = now(),
         last_error = 'recovered from stale PROCESSING lock'
     WHERE status = 'PROCESSING' AND locked_at < now() - ($1::text || ' milliseconds')::interval`,
    [String(STUCK_AFTER_MS)],
  );
  if (rowCount) log("warn", "recovered stuck events", { count: rowCount });
}

/** Claim the oldest due event, atomically, skipping rows other workers hold. */
async function claim(): Promise<OutboxEvent | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload, attempts, max_attempts
       FROM outbox_events
       WHERE status = 'PENDING' AND available_at <= now()
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );
    if (rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }
    await client.query(
      `UPDATE outbox_events SET status = 'PROCESSING', attempts = attempts + 1, locked_at = now()
       WHERE id = $1`,
      [rows[0].id],
    );
    await client.query("COMMIT");
    return {
      ...rows[0],
      attempts: Number(rows[0].attempts), // attempts as seen before increment
      max_attempts: Number(rows[0].max_attempts),
    } as OutboxEvent;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Event types the web tier knows how to revalidate (an updated published
 * story refreshes the same tags/paths as the original publish; an archived
 * story disappears from them). */
const DELIVERABLE_EVENTS = new Set([
  "article.published",
  "article.updated",
  "article.archived",
]);

/** Deliver one event to the web tier's revalidation webhook (idempotent). */
async function deliver(event: OutboxEvent): Promise<void> {
  if (!DELIVERABLE_EVENTS.has(event.event_type)) {
    throw new Error(`Unknown event type: ${event.event_type}`);
  }
  const res = await fetch(revalidateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidate-secret": revalidateSecret,
    },
    body: JSON.stringify({
      event: event.event_type,
      aggregateId: event.aggregate_id,
      ...event.payload,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `webhook ${res.status}: ${text.slice(0, 200) || "no body"}`,
    );
  }
}

async function markDone(id: string) {
  await pool.query(
    `UPDATE outbox_events SET status = 'DONE', processed_at = now(), last_error = NULL WHERE id = $1`,
    [id],
  );
}

async function markFailed(event: OutboxEvent, message: string) {
  const attempts = event.attempts + 1; // claim() already incremented
  if (attempts >= event.max_attempts) {
    await pool.query(
      `UPDATE outbox_events SET status = 'FAILED', last_error = $2 WHERE id = $1`,
      [event.id, message.slice(0, 2000)],
    );
    await alert("outbox event failed permanently", {
      eventId: event.id,
      eventType: event.event_type,
      aggregateId: event.aggregate_id,
      attempts,
      error: message.slice(0, 500),
    });
    return;
  }
  const backoffMs = Math.min(5_000 * 2 ** attempts, 5 * 60_000); // 10s, 20s, 40s, 80s, capped 5m
  await pool.query(
    `UPDATE outbox_events
     SET status = 'PENDING', available_at = now() + ($2::text || ' milliseconds')::interval, last_error = $3
     WHERE id = $1`,
    [event.id, String(backoffMs), message.slice(0, 2000)],
  );
  log("warn", "delivery failed, retry scheduled", {
    eventId: event.id,
    attempts,
    backoffMs,
    error: message.slice(0, 300),
  });
}

/** Drain due events (bounded per tick so a big backlog cannot starve heartbeats). */
async function drain(maxPerTick = 20) {
  for (let i = 0; i < maxPerTick && !shuttingDown; i += 1) {
    const event = await claim();
    if (!event) return;
    const startedAtMs = Date.now();
    try {
      await deliver(event);
      await markDone(event.id);
      log("info", "event delivered", {
        eventId: event.id,
        eventType: event.event_type,
        aggregateId: event.aggregate_id,
        durMs: Date.now() - startedAtMs,
      });
    } catch (err) {
      await markFailed(event, err instanceof Error ? err.message : String(err));
    }
  }
}

/**
 * Publish scheduled articles whose time has come. Mirrors the API's publish
 * transaction: status flip + revision snapshot + audit row + outbox event in
 * ONE transaction (the drain loop delivers the event on the next tick).
 * Row locking (FOR UPDATE SKIP LOCKED) serializes concurrent workers; the
 * `status = 'SCHEDULED'` guard inside the lock makes double-publishing
 * impossible.
 */
async function publishDue(maxPerTick = 5) {
  for (let i = 0; i < maxPerTick && !shuttingDown; i += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{
        id: string;
        slug: string;
        title: string;
        category_slug: string | null;
      }>(
        `SELECT a.id, a.slug, a.title, c.slug AS category_slug
         FROM articles a
         LEFT JOIN categories c ON c.id = a.category_id
         WHERE a.status = 'SCHEDULED' AND a.scheduled_for <= now()
         ORDER BY a.scheduled_for ASC
         LIMIT 1
         FOR UPDATE OF a SKIP LOCKED`,
      );
      if (rows.length === 0) {
        await client.query("COMMIT");
        return;
      }
      const { id, slug, title, category_slug } = rows[0];
      await client.query(
        `UPDATE articles
         SET status = 'PUBLISHED', published_at = now(), scheduled_for = NULL
         WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO article_revisions
           (article_id, version, title, slug, excerpt, body, status, cover_image_url, created_by)
         SELECT id,
                COALESCE((SELECT MAX(version) FROM article_revisions WHERE article_id = $1), 0) + 1,
                title, slug, excerpt, body, status, cover_image_url, NULL
         FROM articles WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
         VALUES (NULL, 'article.publish.scheduled', 'article', $1, $2::jsonb)`,
        [id, JSON.stringify({ from: "SCHEDULED", to: "PUBLISHED" })],
      );
      await client.query(
        `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ('article.published', 'article', $1, $2::jsonb)`,
        [
          id,
          JSON.stringify({
            id,
            slug,
            title,
            publishedAt: new Date().toISOString(),
            categorySlug: category_slug,
          }),
        ],
      );
      await client.query("COMMIT");
      log("info", "scheduled article published", { articleId: id, slug });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}

const startedAt = new Date();

async function main() {
  log("info", "outbox worker starting", {
    revalidateUrl,
    pollMs,
    pid: process.pid,
  });
  await recoverStuck();
  await heartbeat();

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", "shutting down", { signal });
    setTimeout(() => void pool.end().finally(() => process.exit(0)), 100);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  let lastHeartbeat = Date.now();
  for (;;) {
    try {
      await publishDue();
      await drain();
      if (Date.now() - lastHeartbeat > HEARTBEAT_STALE_MS / 2) {
        await heartbeat();
        lastHeartbeat = Date.now();
      }
    } catch (err) {
      log("error", "worker tick failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (shuttingDown) break;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  await pool.end();
}

main().catch(async (err) => {
  await alert("outbox worker crashed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
