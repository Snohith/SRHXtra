import { expect, test } from "@playwright/test";
import {
  API_URL,
  WEB_URL,
  adminHeaders,
  createDraft,
  expectArticleVisibleOnWeb,
} from "./helpers";

/**
 * Article share row: the canonical URL drives both social intents, and the
 * copy button works against the real clipboard. Runs against a published
 * fixture so it exercises the same page a reader gets.
 */
test("share row uses the canonical URL and copies it", async ({
  page,
  request,
  context,
}) => {
  const stamp = Date.now();
  const title = `E2E Share ${stamp}`;
  const slug = `e2e-share-${stamp}`;

  const created = await createDraft(request, title, slug);
  expect(
    (
      await request.post(
        `${API_URL}/api/v1/admin/articles/${created.id}/submit`,
        { headers: adminHeaders() },
      )
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post(
        `${API_URL}/api/v1/admin/articles/${created.id}/publish`,
        { headers: adminHeaders() },
      )
    ).status(),
  ).toBe(201);
  await expectArticleVisibleOnWeb(request, slug, title);

  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: WEB_URL,
  });
  await page.goto(`${WEB_URL}/news/${slug}`);

  const canonicalHref = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  const canonical = new URL(canonicalHref ?? `/news/${slug}`, WEB_URL).href;

  // The top and closing rows share the same actions; test the first.
  const row = page.getByRole("group", { name: "Share this article" }).first();

  const whatsapp = row.getByRole("link", { name: "Share on WhatsApp" });
  const whatsappHref = decodeURIComponent(
    (await whatsapp.getAttribute("href")) ?? "",
  );
  expect(whatsappHref).toContain("https://wa.me/?text=");
  expect(whatsappHref).toContain(title);
  expect(whatsappHref).toContain(canonical);

  const xHref = (await row
    .getByRole("link", { name: "Share on X" })
    .getAttribute("href")) as string;
  const x = new URL(xHref);
  expect(`${x.origin}${x.pathname}`).toBe("https://x.com/intent/post");
  expect(x.searchParams.get("url")).toBe(canonical);
  expect(x.searchParams.get("text")).toBe(title);
  expect(x.searchParams.get("via")).toBe("SRH_Xtra");

  const copy = row.getByRole("button", {
    name: "Copy link to this article",
  });
  await copy.click();
  await expect(copy).toContainText("Copied");
  await expect(row.getByRole("status")).toHaveText("Link copied to clipboard.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    canonical,
  );
});
