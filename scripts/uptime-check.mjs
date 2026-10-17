#!/usr/bin/env node
/**
 * Uptime + pipeline health checks (Step 5). Designed for cron/CI; run it
 * every 5 minutes and alert on failure (see README "Monitoring").
 *
 * Critical checks (exit 1 on failure):
 *   1. API /api/v1/health reachable and DB "up"
 *   2. Outbox has no FAILED events
 *   3. Worker heartbeat fresh (< 30s) — publishing pipeline is running
 *   4. Web homepage / news listing respond 200
 *   5. Newest published article round-trips: API slug -> web page 200
 *
 * On failure (or --webhook URL / ERROR_WEBHOOK_URL set), posts a JSON alert.
 * Env: API_URL, WEB_URL, ERROR_WEBHOOK_URL
 */
const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const webUrl = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const webhookArg = process.argv.indexOf("--webhook");
const webhook =
  (webhookArg !== -1 && process.argv[webhookArg + 1]) || process.env.ERROR_WEBHOOK_URL || "";

const results = [];

function log(level, msg, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, service: "uptime-check", msg, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  return res;
}

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  log(ok ? "info" : "error", `${ok ? "PASS" : "FAIL"} ${name}`, { detail });
}

async function main() {
  const startedAt = Date.now();

  // 1. API health + pipeline snapshot
  let health = null;
  try {
    const res = await fetchWithTimeout(`${apiUrl}/api/v1/health`);
    health = await res.json();
    record("api health", res.ok && health.db === "up", { db: health.db, status: res.status });
  } catch (err) {
    record("api health", false, { error: err.message });
  }

  if (health?.pipeline?.outbox) {
    record("outbox no failed events", health.pipeline.outbox.failed === 0, {
      failed: health.pipeline.outbox.failed,
      pending: health.pipeline.outbox.pending,
    });
  }
  if (health?.pipeline?.worker) {
    const worker = health.pipeline.worker;
    record("worker heartbeat fresh", !worker.stale, {
      lastHeartbeatAt: worker.lastHeartbeatAt,
      ageSeconds: worker.heartbeatAgeSeconds,
    });
  }

  // 4. Web surfaces
  for (const path of ["/", "/news"]) {
    try {
      const res = await fetchWithTimeout(`${webUrl}${path}`);
      record(`web ${path}`, res.status === 200, { status: res.status });
    } catch (err) {
      record(`web ${path}`, false, { error: err.message });
    }
  }

  // 5. Newest published article round-trip (API listing -> rendered page)
  try {
    const listRes = await fetchWithTimeout(`${apiUrl}/api/v1/articles?pageSize=1&sort=newest`);
    const list = await listRes.json();
    const slug = list?.data?.[0]?.slug;
    if (!slug) throw new Error("no published articles");
    const pageRes = await fetchWithTimeout(`${webUrl}/news/${slug}`);
    record("newest article page", pageRes.status === 200, { slug, status: pageRes.status });
  } catch (err) {
    record("newest article page", false, { error: err.message });
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    ok: failed.length === 0,
    checks: results.length,
    failed: failed.map((r) => r.name),
    durationMs: Date.now() - startedAt,
  };

  if (!summary.ok && webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "uptime-check", level: "error", summary, results, ts: new Date().toISOString() }),
        signal: AbortSignal.timeout(4000),
      });
      log("info", "alert sent", { webhook });
    } catch (err) {
      log("error", "alert delivery failed", { error: err.message });
    }
  }

  log(summary.ok ? "info" : "error", summary.ok ? "ALL CHECKS PASSED" : "UPTIME CHECKS FAILED", summary);
  process.exit(summary.ok ? 0 : 1);
}

main().catch((err) => {
  log("error", "uptime check crashed", { error: err.message });
  process.exit(1);
});
