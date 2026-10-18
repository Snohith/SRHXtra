#!/usr/bin/env node
/**
 * Auth & injection red-team checks — STAGING ONLY.
 *
 * Covers:
 *   1. SQL-injection battery: quote / boolean / union / comment probes on
 *      public (and optionally admin) API query params. Any 5xx response or
 *      leaked SQL error text = FAIL (params must be parameterized).
 *   2. Login rate-limit / lockout burst: BURST wrong-password attempts against
 *      LOGIN_URL; reports whether blocking kicks in (429/423) or responses
 *      stay uniform (no visible lockout).
 *   3. User enumeration: wrong password with the real email vs fake emails;
 *      different status/message = FAIL.
 *
 * Safety guards:
 *   - Refuses any non-localhost target unless ALLOW_REMOTE=1 is set.
 *   - Only ever point that at a STAGING clone. Brute-forcing or injecting
 *     into production can lock real admins out, trip abuse monitoring, and
 *     (for injections) damage data.
 *   - The login burst is bounded (default 15) and only runs when LOGIN_URL
 *     is provided.
 *
 * Usage:
 *   pnpm security:auth                                  # local API on :4000
 *   API_URL=https://staging.example.com ALLOW_REMOTE=1 pnpm security:auth
 *
 *   # Login tests (JSON login endpoints only):
 *   API_URL=... ALLOW_REMOTE=1 \
 *   LOGIN_URL=https://staging.example.com/login \
 *   LOGIN_EMAIL=admin@example.com pnpm security:auth
 *
 * For Next.js server-action logins (the deployed admin), JSON mode does not
 * apply. Instead, on STAGING: submit one wrong password in the browser,
 * DevTools → Network → right-click the request → Copy as cURL, then:
 *   for i in $(seq 1 15); do
 *     curl -s -o /dev/null -w "%{http_code}\n" '<paste curl here>';
 *   done | sort | uniq -c
 *   15× the same code = no visible lockout; 429/423 = blocking works.
 *
 * Env: API_URL, ALLOW_REMOTE, ADMIN_API_TOKEN, LOGIN_URL, LOGIN_EMAIL,
 *      LOGIN_HEADERS (JSON), LOGIN_BODY (JSON), BURST
 */
const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const TOKEN = process.env.ADMIN_API_TOKEN;
const BURST = Math.min(Number(process.env.BURST ?? 15) || 15, 50);
const ALLOW_REMOTE = process.env.ALLOW_REMOTE === "1";

function assertLocalOrAllowed(label, raw) {
  let host;
  try {
    host = new URL(raw).hostname;
  } catch {
    console.error(`${label} is not a valid URL: ${raw}`);
    process.exit(2);
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && !ALLOW_REMOTE) {
    console.error(
      `${label} points at ${host} — refusing.\n` +
        `This suite sends attack-shaped traffic. Set ALLOW_REMOTE=1 only for a staging clone.`,
    );
    process.exit(2);
  }
}
assertLocalOrAllowed("API_URL", API);
if (process.env.LOGIN_URL) assertLocalOrAllowed("LOGIN_URL", process.env.LOGIN_URL);

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function info(msg) {
  console.log(`INFO  ${msg}`);
}

const SQLI_PAYLOADS = [
  "'",
  "''",
  "' OR '1'='1",
  "' OR '1'='1'--",
  "' UNION SELECT NULL--",
  "') OR ('1'='1",
  "\\'",
  "%27",
];
const SQL_ERROR_MARKERS = [
  "syntax error",
  "unterminated",
  "invalid input syntax",
  "operator does not exist",
  "pg_",
  "postgresql",
  "sqlite",
  "sequelize",
  "typeorm",
];

async function fetchText(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    const text = await res.text().catch(() => "");
    return { status: res.status, text };
  } catch (err) {
    return { status: 0, text: String(err?.message ?? err) };
  }
}

function looksLikeSqlLeak(text) {
  const lower = text.toLowerCase();
  return SQL_ERROR_MARKERS.some((m) => lower.includes(m));
}

async function sqlProbe(label, url, headers = {}) {
  const { status, text } = await fetchText(url, headers);
  const ok = status > 0 && status < 500 && !looksLikeSqlLeak(text);
  check(
    label,
    ok,
    ok
      ? `status=${status}`
      : status === 0
        ? `unreachable (${text.slice(0, 80)})`
        : `status=${status}${looksLikeSqlLeak(text) ? " + SQL error text leaked!" : ""}`,
  );
}

async function main() {
  const adminHeaders = TOKEN
    ? { Authorization: `Bearer ${TOKEN}`, "x-admin-user-id": "admin@srh.local" }
    : null;

  // Baseline first — confirms the API (and admin token) actually work.
  const baseline = await fetchText(`${API}/api/v1/articles?page=1&pageSize=1`);
  if (baseline.status !== 200) {
    info(
      `baseline /api/v1/articles returned ${baseline.status} — is the (staging) API running? Continuing anyway.`,
    );
  } else {
    info("baseline public list OK (200)");
  }
  if (TOKEN && adminHeaders) {
    const admin = await fetchText(`${API}/api/v1/admin/articles?page=1&pageSize=1`, adminHeaders);
    info(`baseline admin list: ${admin.status}`);
  }

  // 1. SQL-injection battery on public params.
  for (const p of SQLI_PAYLOADS) {
    const q = encodeURIComponent(p);
    await sqlProbe(`search=${JSON.stringify(p)}`, `${API}/api/v1/articles?search=${q}&page=1&pageSize=5`);
    await sqlProbe(`category=${JSON.stringify(p)}`, `${API}/api/v1/articles?category=${q}&page=1&pageSize=5`);
    await sqlProbe(`sort=${JSON.stringify(p)}`, `${API}/api/v1/articles?sort=${q}&page=1&pageSize=5`);
    await sqlProbe(`page=${JSON.stringify(p)}`, `${API}/api/v1/articles?page=${q}&pageSize=5`);
    await sqlProbe(`slug=${JSON.stringify(p)}`, `${API}/api/v1/articles/${q}`);
  }
  // Admin params (only when ADMIN_API_TOKEN provided).
  if (adminHeaders) {
    for (const p of SQLI_PAYLOADS.slice(0, 4)) {
      const q = encodeURIComponent(p);
      await sqlProbe(
        `admin search=${JSON.stringify(p)}`,
        `${API}/api/v1/admin/articles?search=${q}&page=1&pageSize=5`,
        adminHeaders,
      );
      await sqlProbe(
        `admin status=${JSON.stringify(p)}`,
        `${API}/api/v1/admin/articles?status=${q}&page=1&pageSize=5`,
        adminHeaders,
      );
    }
  }

  // 2 + 3. Login lockout + enumeration (JSON endpoints only).
  if (!process.env.LOGIN_URL) {
    info("LOGIN_URL not set — skipping login burst / enumeration (see file header for server-action instructions).");
  } else {
    const LOGIN_URL = process.env.LOGIN_URL;
    let extraHeaders = {};
    if (process.env.LOGIN_HEADERS) {
      try {
        extraHeaders = JSON.parse(process.env.LOGIN_HEADERS);
      } catch {
        console.error("LOGIN_HEADERS is not valid JSON — skipping login tests.");
      }
    }
    const headers = { "content-type": "application/json", ...extraHeaders };
    const email = process.env.LOGIN_EMAIL ?? "admin@example.com";
    const bodyFor = (mail) => {
      let base = { email: mail, password: "definitely-wrong-password-123" };
      if (process.env.LOGIN_BODY) {
        try {
          base = { ...JSON.parse(process.env.LOGIN_BODY), email: mail };
        } catch {
          /* fall back to default body */
        }
      }
      return JSON.stringify(base);
    };

    const burst = [];
    for (let i = 0; i < BURST; i += 1) {
      const res = await fetch(LOGIN_URL, { method: "POST", headers, body: bodyFor(email) }).catch(() => null);
      burst.push(res ? res.status : 0);
    }
    const unique = [...new Set(burst)].sort();
    const blocked = burst.some((s) => [429, 423, 403, 503].includes(s));
    check(
      `login burst (${BURST} attempts) gets blocked`,
      blocked,
      `status codes seen: ${burst.join(",")}${blocked ? "" : " — no lockout/rate-limit visible"}`,
    );

    // Enumeration: real vs fake emails, single attempt each, compare output.
    const samples = [];
    for (const mail of [email, "nobody-1@example.invalid", "nobody-2@example.invalid"]) {
      const res = await fetch(LOGIN_URL, { method: "POST", headers, body: bodyFor(mail) }).catch(() => null);
      const text = res ? await res.text().catch(() => "") : "";
      samples.push({ mail, status: res?.status ?? 0, len: text.length, text: text.slice(0, 120) });
    }
    const first = samples[0];
    const same = samples.every((s) => s.status === first.status && s.len === first.len);
    check(
      "login errors identical for real vs unknown user",
      same,
      same ? `status=${first.status}` : `differs: ${samples.map((s) => `${s.mail}→${s.status}/${s.len}b`).join(" ")}`,
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log("");
  console.log(failed === 0 ? `ALL ${results.length} AUTH CHECKS PASSED` : `${failed} OF ${results.length} CHECK(S) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`auth-redteam crashed: ${err.message}`);
  process.exit(1);
});
