import { expect, test } from "@playwright/test";
import {
  ADMIN_URL,
  ADMIN_USER,
  TINY_JPEG,
  TOKEN,
  WEB_URL,
  expectArticleVisibleOnWeb,
} from "./helpers";

/**
 * The full editorial flow, through the real UI:
 *   sign in → create draft (with a signed-URL image upload) → assert the draft
 *   is invisible to readers → submit for review → publish → readers see it
 *   within seconds (outbox worker → on-demand revalidation).
 */
test("editor publishes an article and readers see it within seconds", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const title = `E2E Publish Flow ${stamp}`;
  const slug = `e2e-publish-flow-${stamp}`;

  // 1. Staff sign-in (credentials verified server-side on every request).
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Staff API token").fill(TOKEN);
  await page.getByLabel("Staff email or user ID").fill(ADMIN_USER);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${ADMIN_URL}/`);

  // 2. New draft, including a real featured-image upload through the signed flow.
  await page.goto(`${ADMIN_URL}/articles/new`);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Summary").fill(`Summary for ${title}.`);
  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-cover.jpg",
    mimeType: "image/jpeg",
    buffer: TINY_JPEG,
  });
  await expect(page.locator("img.coverthumb")).toBeVisible({ timeout: 20_000 });
  await page.locator(".tiptap").click();
  await page.keyboard.type(
    `${title} — body written by the end-to-end publish test.`,
  );
  await page.getByRole("button", { name: "Save draft" }).click();

  // 3. Land on the article page; the draft round-tripped through the API.
  await expect(page).toHaveURL(new RegExp(`/articles/[0-9a-f-]{36}$`));
  await expect(page.getByLabel("Title")).toHaveValue(title);

  // 4. The draft must be invisible to readers.
  expect((await request.get(`${WEB_URL}/news/${slug}`)).status()).toBe(404);

  // 5. Submit for review, then publish.
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Submitted for review")).toBeVisible();
  // Workflow v2 renamed the action; reviewers/publishers get "Publish now".
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(
    page.getByText("Published — a revision was recorded."),
  ).toBeVisible();

  // 6. Readers see it — the worker consumed the outbox event and revalidated
  //    the caches, so this happens in seconds, not after the 60s ISR window.
  await expectArticleVisibleOnWeb(request, slug, title);
  await expect
    .poll(async () => (await request.get(`${WEB_URL}/news`)).text(), {
      timeout: 20_000,
      intervals: [500, 1000],
      message: "news listing should include the freshly published article",
    })
    .toContain(title);
});
