import { devices, expect, test } from "@playwright/test";
import {
  ADMIN_URL,
  API_URL,
  PUBLISHER_TOKEN,
  WEB_URL,
  WRITER_TOKEN,
  adminHeaders,
  adminHeadersFor,
  createDraftAs,
  ensureWorkerRunning,
  expectArticleVisibleOnWeb,
  sql,
  stopWorker,
  workerRunning,
} from "./helpers";

/**
 * The full acceptance scenario, one test per numbered step:
 *
 *  1. A writer creates a draft.
 *  2. An unauthorized user attempts to publish it and is denied.
 *  3. An authorized publisher approves and publishes it.
 *  4. The article appears on the public homepage.
 *  5. The article URL loads correctly on mobile.
 *  6. Updating the article refreshes its public content and metadata.
 *  7. An archived or unpublished article no longer appears in public listings.
 *  8. The application recovers correctly from a failed background job /
 *     deployment (worker down → durable outbox → fresh worker delivers).
 *
 * Serial: the steps follow one story through its whole lifecycle.
 */
test.describe.configure({ mode: "serial" });

const WRITER = "writer@srh.local";
const PUBLISHER = "publisher@srh.local";
const stamp = Date.now();

let articleId = "";
let slug = "";
let title = "";
let updatedTitle = "";

test.beforeAll(() => {
  // Fixture staff — writer + publisher roles (removed again by the global teardown).
  sql(`
    INSERT INTO users (email, display_name, status)
    VALUES ('${WRITER}', 'E2E Writer', 'active'), ('${PUBLISHER}', 'E2E Publisher', 'active')
    ON CONFLICT (email) DO NOTHING;
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'writer' WHERE u.email = '${WRITER}'
    ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'publisher' WHERE u.email = '${PUBLISHER}'
    ON CONFLICT DO NOTHING;
    UPDATE users SET api_token_hash = encode(digest('${WRITER_TOKEN}', 'sha256'), 'hex')
    WHERE email = '${WRITER}';
    UPDATE users SET api_token_hash = encode(digest('${PUBLISHER_TOKEN}', 'sha256'), 'hex')
    WHERE email = '${PUBLISHER}';
  `);
});

test("1. a writer creates a draft", async ({ request }) => {
  title = `E2E Scenario ${stamp}`;
  slug = `e2e-scenario-${stamp}`;

  const res = await request.post(`${API_URL}/api/v1/admin/articles`, {
    headers: adminHeadersFor(WRITER, true),
    data: {
      title,
      slug,
      excerpt: "Written by the writer, pending review.",
      body: "<p>Acceptance scenario body — created as a draft.</p>",
      categoryId: 1,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const created = await res.json();
  articleId = created.id;
  expect(created.status).toBe("DRAFT");
  expect(created.slug).toBe(slug);
});

test("2. the writer's publish attempt is denied and stays invisible", async ({
  request,
}) => {
  const denied = await request.post(
    `${API_URL}/api/v1/admin/articles/${articleId}/publish`,
    { headers: adminHeadersFor(WRITER) },
  );
  expect(denied.status()).toBe(403);
  expect((await denied.json()).message).toContain("admin, editor, publisher");

  // The denial changed nothing: still a draft, still invisible to readers.
  const admin = await request.get(
    `${API_URL}/api/v1/admin/articles/${articleId}`,
    { headers: adminHeaders() },
  );
  expect((await admin.json()).status).toBe("DRAFT");
  expect(
    (await request.get(`${API_URL}/api/v1/articles/${slug}`)).status(),
  ).toBe(404);
  expect((await request.get(`${WEB_URL}/news/${slug}`)).status()).toBe(404);
});

test("3. an authorized publisher approves and publishes it", async ({
  page,
  request,
}) => {
  // The writer submits it for review (DRAFT → IN_REVIEW).
  const submitted = await request.post(
    `${API_URL}/api/v1/admin/articles/${articleId}/submit`,
    { headers: adminHeadersFor(WRITER) },
  );
  expect(submitted.status()).toBe(201);
  expect((await submitted.json()).status).toBe("IN_REVIEW");

  // In the admin UI the writer sees it waiting, with no publish control.
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Staff API token").fill(WRITER_TOKEN);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto(`${ADMIN_URL}/articles/${articleId}`);
  await expect(page.getByText("Awaiting review")).toBeVisible();
  await expect(
    page.getByText("publishing requires an editor, publisher, or admin role"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toHaveCount(0);

  // The publisher publishes (IN_REVIEW → PUBLISHED).
  const published = await request.post(
    `${API_URL}/api/v1/admin/articles/${articleId}/publish`,
    { headers: adminHeadersFor(PUBLISHER) },
  );
  expect(published.status(), await published.text()).toBe(201);
  const body = await published.json();
  expect(body.status).toBe("PUBLISHED");
  expect(body.publishedAt).toBeTruthy();
});

test("4. the article appears on the public homepage", async ({ request }) => {
  await expectArticleVisibleOnWeb(request, slug, title);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(title);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(title);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/sitemap.xml`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(`/news/${slug}`);
});

test("5. the article URL loads correctly on mobile", async ({ browser }) => {
  const device = devices["iPhone 13"];
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  try {
    const res = await page.goto(`${WEB_URL}/news/${slug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(200);

    // The story renders, with the desktop nav swapped for the mobile menu.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.locator("nav.nav-desktop")).toBeHidden();
    const menu = page.getByRole("button", { name: "Toggle navigation menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "News" })).toBeVisible();

    // No horizontal overflow at phone width (mobile-first requirement).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(
      overflow,
      `horizontal overflow of ${overflow}px at ${device.viewport?.width}px wide`,
    ).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
  }
});

test("6. updating the article refreshes its public content and metadata", async ({
  page,
  request,
}) => {
  updatedTitle = `${title} — updated`;
  const updatedExcerpt =
    "Acceptance scenario: the story was updated and refreshed.";
  const patch = await request.patch(
    `${API_URL}/api/v1/admin/articles/${articleId}`,
    {
      headers: adminHeadersFor(PUBLISHER, true),
      data: { title: updatedTitle, excerpt: updatedExcerpt },
    },
  );
  expect(patch.status(), await patch.text()).toBe(200);
  expect((await patch.json()).title).toBe(updatedTitle);

  // Public content refreshes without waiting for the ISR window (worker → webhook).
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news/${slug}`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(updatedTitle);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(updatedTitle);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toContain(updatedTitle);

  // Metadata refreshes too: og:title, twitter:title, description, JSON-LD.
  const html = await (await request.get(`${WEB_URL}/news/${slug}`)).text();
  expect(html).toContain(`<meta property="og:title" content="${updatedTitle}"`);
  expect(html).toContain(
    `<meta name="twitter:title" content="${updatedTitle}"`,
  );
  expect(html).toContain(
    `<meta name="description" content="${updatedExcerpt}"`,
  );
  expect(html).toContain(`"headline":"${updatedTitle}"`);

  // The admin UI offers the published article as editable, with the new title.
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Staff API token").fill(PUBLISHER_TOKEN);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto(`${ADMIN_URL}/articles/${articleId}`);
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    updatedTitle,
  );
});

test("7. an archived article disappears from public listings", async ({
  request,
}) => {
  // Real workflow path: a publisher archives the live story. The status,
  // audit row and article.archived outbox event commit in one transaction,
  // then the worker revalidates the public pages.
  const archived = await request.post(
    `${API_URL}/api/v1/admin/articles/${articleId}/archive`,
    { headers: adminHeadersFor(PUBLISHER) },
  );
  expect(archived.status(), await archived.text()).toBe(201);
  expect((await archived.json()).status).toBe("ARCHIVED");
  expect(sql(`SELECT status FROM articles WHERE id = '${articleId}';`)).toBe(
    "ARCHIVED",
  );
  expect(
    sql(
      `SELECT COUNT(*) FROM outbox_events WHERE aggregate_id = '${articleId}' AND event_type = 'article.archived';`,
    ),
  ).toBe("1");

  await expect
    .poll(async () => (await request.get(`${WEB_URL}/`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .not.toContain(updatedTitle);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .not.toContain(updatedTitle);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news/${slug}`)).status(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .toBe(404);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/sitemap.xml`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
    })
    .not.toContain(`/news/${slug}`);
  expect(
    (await request.get(`${API_URL}/api/v1/articles/${slug}`)).status(),
  ).toBe(404);
});

test("8. recovers from a failed background job and worker restart", async ({
  request,
}) => {
  const recoveryTitle = `E2E Recovery ${stamp}`;
  const recoverySlug = `e2e-recovery-${stamp}`;
  const created = await createDraftAs(
    request,
    WRITER,
    recoveryTitle,
    recoverySlug,
  );
  const submitted = await request.post(
    `${API_URL}/api/v1/admin/articles/${created.id}/submit`,
    { headers: adminHeadersFor(WRITER) },
  );
  expect(submitted.status()).toBe(201);

  try {
    // The background job runner goes down before the publish.
    stopWorker();
    expect(workerRunning()).toBe(false);

    const published = await request.post(
      `${API_URL}/api/v1/admin/articles/${created.id}/publish`,
      { headers: adminHeadersFor(PUBLISHER) },
    );
    expect(published.status(), await published.text()).toBe(201);

    // Durable and correctly invisible: the event waits in the outbox and the
    // cached public homepage does not show the story yet.
    expect(
      sql(
        `SELECT status FROM outbox_events WHERE aggregate_id = '${created.id}';`,
      ),
    ).toBe("PENDING");
    expect(await (await request.get(`${WEB_URL}/`)).text()).not.toContain(
      recoveryTitle,
    );

    // "Deployment": a fresh worker starts and delivers the backlog in seconds.
    ensureWorkerRunning();
    await expect
      .poll(async () => (await request.get(`${WEB_URL}/`)).text(), {
        timeout: 30_000,
        intervals: [1000],
      })
      .toContain(recoveryTitle);
    await expect
      .poll(
        () =>
          sql(
            `SELECT status FROM outbox_events WHERE aggregate_id = '${created.id}';`,
          ),
        { timeout: 15_000, intervals: [500] },
      )
      .toBe("DONE");
  } finally {
    ensureWorkerRunning();
  }
});
