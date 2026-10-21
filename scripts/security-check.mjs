#!/usr/bin/env node
/**
 * Automated admin security checks — a compact regression suite of the
 * attack classes exercised in the red-team pass. Run it in CI and after any
 * auth/publishing change:
 *
 *   pnpm security:check [--rate-limit]
 *
 * Covers:
 *   - auth bypass attempts (missing/wrong/empty token, unknown user)
 *   - mass assignment (client-forced status/roles rejected)
 *   - draft invisibility (public 404, no existence leak)
 *   - RBAC: writer cannot publish
 *   - revalidation webhook secret enforced
 *   - SSRF: image optimizer rejects non-allowlisted hosts pre-fetch
 *   - security headers present on web
 *   - optional --rate-limit: 65 rapid admin calls must produce 429s
 *
 * Requires the stack to be running; creates and cleans up its own fixtures.
 */
import { spawnSync } from "node:child_process";

const API = (process.env.API_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);
const WEB = (process.env.WEB_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const TOKEN = process.env.ADMIN_API_TOKEN ?? "dev-admin-token";
const ADMIN_EMAIL = process.env.ADMIN_USER ?? "admin@srh.local";
const CONTAINER = process.env.CONTAINER ?? "srh-news-db";
const DB = process.env.DB_NAME ?? "srh_news";
const USER = process.env.DB_USER ?? "srh";
const PSQL_URL = process.env.PSQL_URL;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

async function call(
  method,
  path,
  { token = TOKEN, actor, body, raw = false, base = API } = {},
) {
  const headers = {};
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  if (actor) headers["x-admin-user-id"] = actor;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    let parsed = null;
    try {
      parsed = await res.json();
    } catch {
      /* non-JSON (image) */
    }
    return { status: res.status, body: parsed, headers: res.headers };
  } catch (err) {
    return { status: 0, body: null, error: err.message };
  }
}

function psql(sql) {
  const args = PSQL_URL
    ? [PSQL_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql]
    : [CONTAINER, "psql", "-U", USER, "-d", DB, "-t", "-A", "-c", sql];
  const res = spawnSync(
    PSQL_URL ? "psql" : "docker",
    PSQL_URL ? args : ["exec", ...args],
    {
      encoding: "utf8",
    },
  );
  if (res.error || res.status !== 0) {
    const detail = res.stderr || res.error?.message || "unknown psql error";
    throw new Error(`psql failed: ${detail.trim().slice(0, 200)}`);
  }
  return (res.stdout ?? "").trim();
}

async function main() {
  const fixtures = { articles: [], users: [] };

  try {
    // 1. Auth bypass attempts
    check(
      "no token -> 401",
      (await call("GET", "/api/v1/admin/me", { token: null })).status === 401,
    );
    check(
      "wrong token -> 401",
      (await call("GET", "/api/v1/admin/me", { token: "wrong" })).status ===
        401,
    );
    check(
      "empty bearer -> 401",
      (await call("GET", "/api/v1/admin/me", { token: "" })).status === 401,
    );
    const me = await call("GET", "/api/v1/admin/me", {
      actor: "00000000-0000-0000-0000-000000000000",
    });
    check(
      "client-chosen actor header is ignored",
      me.status === 200 && me.body?.email === ADMIN_EMAIL,
      `status=${me.status} email=${me.body?.email ?? "?"}`,
    );

    // 2. Mass assignment
    const mass = await call("POST", "/api/v1/admin/articles", {
      body: {
        title: "security-check fixture",
        body: "x",
        status: "PUBLISHED",
        publishedAt: "2020-01-01",
      },
    });
    check("mass assignment -> 400", mass.status === 400);

    // 3. Draft invisibility + admin-only visibility
    const created = await call("POST", "/api/v1/admin/articles", {
      body: {
        title: `Security Check Draft ${Date.now()}`,
        body: "<p>fixture</p>",
      },
    });
    if (created.status !== 201)
      throw new Error(`fixture create failed: ${created.status}`);
    fixtures.articles.push(created.body.id);
    const slug = created.body.slug;
    check(
      "draft public GET -> 404",
      (await call("GET", `/api/v1/articles/${slug}`)).status === 404,
    );
    check(
      "draft visible to admins",
      (await call("GET", `/api/v1/admin/articles/${created.body.id}`))
        .status === 200,
    );

    // 4. RBAC: writer cannot publish
    const writerEmail = `security-writer-${Date.now()}@srh.local`;
    const writerToken = `security-writer-token-${Date.now()}`;
    const writerId = psql(
      `INSERT INTO users (email, display_name) VALUES ('${writerEmail}', 'Security Writer') ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id;`,
    ).match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    )?.[0];
    if (!writerId) throw new Error("could not create writer fixture");
    fixtures.users.push(writerEmail);
    psql(
      `INSERT INTO user_roles (user_id, role_id) SELECT '${writerId}', id FROM roles WHERE name='writer' ON CONFLICT DO NOTHING;
       UPDATE users SET api_token_hash=encode(digest('${writerToken}', 'sha256'), 'hex') WHERE id='${writerId}';`,
    );
    await call("POST", `/api/v1/admin/articles/${created.body.id}/submit`, {
      token: writerToken,
    });
    const writerPublish = await call(
      "POST",
      `/api/v1/admin/articles/${created.body.id}/publish`,
      {
        token: writerToken,
      },
    );
    check("writer publish -> 403", writerPublish.status === 403);

    // 5. Revalidation webhook secret. A prior Playwright run may have exhausted
    // the invalid-secret throttle; 429 is the safe outcome too.
    const revalidateWrong = await call("POST", "/api/revalidate", {
      token: null,
      body: { slug: "x" },
      base: WEB,
    });
    check(
      "revalidate wrong secret -> 401/429",
      revalidateWrong.status === 401 || revalidateWrong.status === 429,
    );

    // 6. SSRF: optimizer rejects arbitrary host pre-fetch
    const ssrf = await call(
      "GET",
      "/_next/image?url=https%3A%2F%2Fexample.com%2Fhero.jpg&w=1200&q=75",
      { token: null, base: WEB },
    );
    check("image optimizer SSRF -> 400", ssrf.status === 400);

    // 7. Security headers on web
    const home = await call("GET", "/", { token: null, base: WEB });
    const csp = home.headers?.get("content-security-policy") ?? "";
    check("CSP header present", csp.includes("default-src 'self'"));
    check(
      "nosniff header present",
      home.headers?.get("x-content-type-options") === "nosniff",
    );
    check(
      "frame deny present",
      home.headers?.get("x-frame-options") === "DENY",
    );

    // 8. Optional rate-limit probe
    if (process.argv.includes("--rate-limit")) {
      const statuses = [];
      for (let i = 0; i < 65; i += 1) {
        const res = await call("GET", "/api/v1/admin/me");
        statuses.push(res.status);
      }
      const got429 = statuses.filter((s) => s === 429).length;
      check(
        `rate limit kicks in (${got429} x 429)`,
        got429 > 0,
        `200s=${statuses.filter((s) => s === 200).length}`,
      );
    }
  } finally {
    // Cleanup fixtures regardless of outcome.
    for (const id of fixtures.articles) {
      psql(
        `DELETE FROM articles WHERE id='${id}'; DELETE FROM audit_logs WHERE resource_id='${id}';`,
      );
    }
    for (const email of fixtures.users) {
      psql(`DELETE FROM users WHERE email='${email}';`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("");
  console.log(
    failed.length === 0
      ? `ALL ${results.length} SECURITY CHECKS PASSED`
      : `${failed.length} CHECK(S) FAILED`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`security-check crashed: ${err.message}`);
  process.exit(1);
});
