import { expect, test } from "@playwright/test";

import { API_URL, WEB_URL } from "./helpers";

/**
 * Migration smoke test for Next.js 15.5.28: dynamic route params are async,
 * generated OG images still render, and the optimizer emits WebP (AVIF is
 * deliberately not configured).
 */
test("dynamic OG images and the image optimizer work after the Next 15 migration", async ({
  request,
}) => {
  const feed = await request.get(
    `${API_URL}/api/v1/articles?page=1&pageSize=1`,
  );
  expect(feed.status()).toBe(200);
  const body = (await feed.json()) as { data: Array<{ slug: string }> };
  const slug = body.data[0]?.slug;
  expect(slug).toBeTruthy();

  const articleOg = await request.get(
    `${WEB_URL}/news/${slug}/opengraph-image`,
  );
  expect(articleOg.status()).toBe(200);
  expect(articleOg.headers()["content-type"]).toContain("image/png");
  expect((await articleOg.body()).byteLength).toBeGreaterThan(1_000);

  const playerOg = await request.get(
    `${WEB_URL}/squad/abhishek-sharma/opengraph-image`,
  );
  expect(playerOg.status()).toBe(200);
  expect(playerOg.headers()["content-type"]).toContain("image/png");
  expect((await playerOg.body()).byteLength).toBeGreaterThan(1_000);

  const optimized = await request.get(
    `${WEB_URL}/_next/image?url=%2Flogo.png&w=256&q=75`,
    { headers: { Accept: "image/avif,image/webp,*/*" } },
  );
  expect(optimized.status()).toBe(200);
  expect(optimized.headers()["content-type"]).toBe("image/webp");
  expect((await optimized.body()).subarray(0, 4).toString()).toBe("RIFF");
});
