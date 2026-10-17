import { execFileSync, execSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";

/** Targets — overridable so the suite can run against a staging stack. */
export const ADMIN_URL = (
  process.env.ADMIN_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");
export const WEB_URL = (process.env.WEB_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);
export const TOKEN = process.env.ADMIN_API_TOKEN ?? "dev-admin-token";
export const ADMIN_USER = process.env.ADMIN_USER ?? "admin@srh.local";
export const REVALIDATE_SECRET =
  process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret";

/** Repo root (this file lives in apps/e2e/tests). */
export const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const WORKER_PATTERN = "node apps/api/dist/worker.js";
const DB_CONTAINER = process.env.CONTAINER ?? "srh-news-db";
const DB_USER = process.env.DB_USER ?? "srh";
const DB_NAME = process.env.DB_NAME ?? "srh_news";

/** Run SQL against the dev Postgres container (fixtures + assertions). */
export function sql(query: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      DB_CONTAINER,
      "psql",
      "-U",
      DB_USER,
      "-d",
      DB_NAME,
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}

/** 1x1 JPEG — enough to exercise the real sign → PUT → complete upload path. */
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDJ/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==",
  "base64",
);

/** Staff headers for a given actor (email or UUID), authorized by the API token. */
export function adminHeadersFor(
  actor: string,
  withJson = false,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    "x-admin-user-id": actor,
  };
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
}

export function adminHeaders(withJson = false): Record<string, string> {
  return adminHeadersFor(ADMIN_USER, withJson);
}

export interface CreatedArticle {
  id: string;
  slug: string;
  title: string;
  status: string;
}

/** Create a draft as a specific staff actor. */
export async function createDraftAs(
  request: APIRequestContext,
  actor: string,
  title: string,
  slug: string,
): Promise<CreatedArticle> {
  const res = await request.post(`${API_URL}/api/v1/admin/articles`, {
    headers: adminHeadersFor(actor, true),
    data: {
      title,
      slug,
      excerpt: `${title} — e2e summary`,
      body: `<p>${title} e2e body.</p>`,
      categoryId: 1,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as CreatedArticle;
}

/** Create a draft through the admin account. */
export async function createDraft(
  request: APIRequestContext,
  title: string,
  slug: string,
): Promise<CreatedArticle> {
  return createDraftAs(request, ADMIN_USER, title, slug);
}

/** Wait until the rendered public article page exists and shows the title. */
export async function expectArticleVisibleOnWeb(
  request: APIRequestContext,
  slug: string,
  title: string,
  timeoutMs = 20_000,
) {
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news/${slug}`)).status(), {
      timeout: timeoutMs,
      intervals: [500, 1000],
      message: `public article /news/${slug} should render within ${timeoutMs}ms`,
    })
    .toBe(200);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news/${slug}`)).text(), {
      timeout: timeoutMs,
      intervals: [500, 1000],
    })
    .toContain(title);
}

// -- Worker control (scenario step 8: failed background job / redeploy) -------

export function workerRunning(): boolean {
  try {
    execSync(`pgrep -f '${WORKER_PATTERN}'`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Kill the outbox worker and wait until the process is really gone. */
export function stopWorker(): void {
  try {
    execSync(`pkill -f '${WORKER_PATTERN}'`, { stdio: "ignore" });
  } catch {
    /* already down */
  }
  const deadline = Date.now() + 5000;
  while (workerRunning() && Date.now() < deadline) execSync("sleep 0.2");
}

/**
 * Start the worker (detached) if it is not running. Used by the recovery test
 * and as a safety net in the global teardown.
 */
export function ensureWorkerRunning(): void {
  if (workerRunning()) return;
  const child = spawn("node", ["apps/api/dist/worker.js"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://srh:srh_dev_password@localhost:5432/srh_news",
      WEB_REVALIDATE_URL:
        process.env.WEB_REVALIDATE_URL ??
        "http://localhost:3000/api/revalidate",
      REVALIDATE_SECRET:
        process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret",
    },
  });
  child.unref();
  const deadline = Date.now() + 5000;
  while (!workerRunning() && Date.now() < deadline) execSync("sleep 0.2");
}
