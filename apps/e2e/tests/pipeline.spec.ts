import { expect, test } from "@playwright/test";
import {
  API_URL,
  REVALIDATE_SECRET,
  WEB_URL,
  adminHeaders,
  createDraft,
  expectArticleVisibleOnWeb,
  sql,
} from "./helpers";

/**
 * Pipeline contract at the API level:
 *   draft invisible → submit → publish → committed → revalidated → visible.
 * Runs against the same stack as the UI flow but without a browser, so it also
 * works in CI as the fast reliability gate.
 */
test("publish commits transactionally and reaches readers quickly", async ({
  request,
}) => {
  const stamp = Date.now();
  const title = `E2E Pipeline ${stamp}`;
  const slug = `e2e-pipeline-${stamp}`;

  const created = await createDraft(request, title, slug);

  // Drafts are never exposed publicly.
  expect(
    (await request.get(`${API_URL}/api/v1/articles/${slug}`)).status(),
  ).toBe(404);
  expect((await request.get(`${WEB_URL}/news/${slug}`)).status()).toBe(404);

  // Forward-only workflow: draft cannot jump straight to PUBLISHED.
  const early = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/publish`,
    {
      headers: adminHeaders(),
    },
  );
  expect(early.status()).toBe(400);

  const submitted = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/submit`,
    {
      headers: adminHeaders(),
    },
  );
  expect(submitted.status()).toBe(201);

  const publishRes = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/publish`,
    {
      headers: adminHeaders(),
    },
  );
  expect(publishRes.status()).toBe(201);
  expect((await publishRes.json()).status).toBe("PUBLISHED");

  // Public API + rendered web page, without waiting for the ISR window.
  await expect
    .poll(
      async () =>
        (await request.get(`${API_URL}/api/v1/articles/${slug}`)).status(),
      {
        timeout: 20_000,
        intervals: [500, 1000],
      },
    )
    .toBe(200);
  await expectArticleVisibleOnWeb(request, slug, title);

  // Re-publishing a PUBLISHED article is rejected (forward-only).
  const republish = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/publish`,
    {
      headers: adminHeaders(),
    },
  );
  expect(republish.status()).toBe(400);
});

test("scheduled publishing flips the article live via the worker", async ({
  request,
}) => {
  const stamp = Date.now();
  const title = `E2E Scheduled ${stamp}`;
  const slug = `e2e-scheduled-${stamp}`;
  const created = await createDraft(request, title, slug);

  const submitted = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/submit`,
    { headers: adminHeaders() },
  );
  expect(submitted.status()).toBe(201);

  const scheduled = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/schedule`,
    {
      headers: adminHeaders(),
      data: { scheduledFor: new Date(Date.now() + 31_000).toISOString() },
    },
  );
  expect(scheduled.status(), await scheduled.text()).toBe(201);
  expect((await scheduled.json()).status).toBe("SCHEDULED");

  // Still invisible while it waits.
  expect(
    (await request.get(`${API_URL}/api/v1/articles/${slug}`)).status(),
  ).toBe(404);

  // The worker publishes when due — no manual click.
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(
              `${API_URL}/api/v1/admin/articles/${created.id}`,
              { headers: adminHeaders() },
            )
          ).json()
        ).status,
      { timeout: 70_000, intervals: [1000, 2000] },
    )
    .toBe("PUBLISHED");

  // Exactly one publish event was written by the scheduled path.
  expect(
    sql(
      `SELECT COUNT(*) FROM outbox_events WHERE aggregate_id = '${created.id}' AND event_type = 'article.published';`,
    ),
  ).toBe("1");
  await expectArticleVisibleOnWeb(request, slug, title);
});

test("revalidation webhook is secret-gated and idempotent", async ({
  request,
}) => {
  const unauthorized = await request.post(`${WEB_URL}/api/revalidate`, {
    data: { event: "article.published", slug: "e2e-whatever" },
  });
  expect(unauthorized.status()).toBe(401);

  const ok = await request.post(`${WEB_URL}/api/revalidate`, {
    headers: { "x-revalidate-secret": REVALIDATE_SECRET },
    data: { event: "article.published", slug: "e2e-whatever" },
  });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).revalidated).toBe(true);
});

test("revalidation webhook throttles repeated invalid secrets but not the worker", async ({
  request,
}) => {
  const statuses: number[] = [];
  for (let i = 0; i < 31; i += 1) {
    const res = await request.post(`${WEB_URL}/api/revalidate`, {
      headers: { "x-revalidate-secret": `wrong-${i}` },
      data: { event: "article.published", slug: "e2e-whatever" },
    });
    statuses.push(res.status());
  }
  expect(statuses).toContain(429);

  const valid = await request.post(`${WEB_URL}/api/revalidate`, {
    headers: { "x-revalidate-secret": REVALIDATE_SECRET },
    data: { event: "article.published", slug: "e2e-whatever" },
  });
  expect(valid.status()).toBe(200);
});
