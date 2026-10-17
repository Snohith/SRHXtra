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

/** 1x1 JPEG — enough to exercise the real sign → PUT → complete upload path. */
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDJ/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==",
  "base64",
);

export function adminHeaders(withJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    "x-admin-user-id": ADMIN_USER,
  };
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
}

export interface CreatedArticle {
  id: string;
  slug: string;
  title: string;
  status: string;
}

/** Create a draft through the admin API. */
export async function createDraft(
  request: APIRequestContext,
  title: string,
  slug: string,
): Promise<CreatedArticle> {
  const res = await request.post(`${API_URL}/api/v1/admin/articles`, {
    headers: adminHeaders(true),
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
      message: `public article /news/${slug} should render within ${timeoutMs}ms of publishing`,
    })
    .toBe(200);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news/${slug}`)).text(), {
      timeout: timeoutMs,
      intervals: [500, 1000],
    })
    .toContain(title);
}
