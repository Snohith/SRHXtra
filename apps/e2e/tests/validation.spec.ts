import { expect, test } from "@playwright/test";
import { API_URL, adminHeaders, createDraft } from "./helpers";

/** Regression coverage for API input validation on the editorial boundary. */
test("malformed article fields are rejected, long articles are accepted", async ({
  request,
}) => {
  const stamp = Date.now();
  const draft = await createDraft(
    request,
    `E2E Validation ${stamp}`,
    `e2e-validation-${stamp}`,
  );
  const patch = (data: Record<string, unknown>) =>
    request.patch(`${API_URL}/api/v1/admin/articles/${draft.id}`, {
      headers: adminHeaders(true),
      data,
    });

  // These used to reach Postgres and surface as 500s.
  expect((await patch({ categoryId: "abc" })).status()).toBe(400);
  expect((await patch({ seoTitle: "" })).status()).toBe(400);
  expect((await patch({ seoDescription: "" })).status()).toBe(400);
  expect((await patch({ coverImageUrl: "not a url" })).status()).toBe(400);
  expect((await patch({ coverImageUrl: "javascript:alert(1)" })).status()).toBe(
    400,
  );

  // Both supported cover shapes still work.
  expect(
    (await patch({ coverImageUrl: "/uploads/e2e-valid.jpg" })).status(),
  ).toBe(200);
  expect(
    (
      await patch({ coverImageUrl: "https://www.iplt20.com/e2e-valid.jpg" })
    ).status(),
  ).toBe(200);

  // body-parser's old 100 kB default turned long features into 500s.
  const long = await request.post(`${API_URL}/api/v1/admin/articles`, {
    headers: adminHeaders(true),
    data: {
      title: `E2E Long Article ${stamp}`,
      slug: `e2e-long-${stamp}`,
      body: "x".repeat(150_000),
    },
  });
  expect(long.status(), await long.text()).toBe(201);

  // Over the explicit 2 MB limit: a clean 413, not an internal error.
  const tooLong = await request.post(`${API_URL}/api/v1/admin/articles`, {
    headers: adminHeaders(true),
    data: {
      title: `E2E Huge Article ${stamp}`,
      slug: `e2e-huge-${stamp}`,
      body: "x".repeat(2_200_000),
    },
  });
  expect(tooLong.status(), await tooLong.text()).toBe(413);
});
