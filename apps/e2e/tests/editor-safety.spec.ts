import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_URL,
  API_URL,
  TINY_JPEG,
  TOKEN,
  adminHeaders,
  createDraft,
  sql,
} from "./helpers";

async function signIn(page: Page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Staff API token").fill(TOKEN);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(`${ADMIN_URL}/`);
}

test("autosave persists edits across a reload", async ({ page, request }) => {
  const stamp = Date.now();
  const created = await createDraft(
    request,
    `E2E Autosave ${stamp}`,
    `e2e-autosave-${stamp}`,
  );
  const summary = `Autosaved summary ${stamp}`;

  await signIn(page);
  await page.goto(`${ADMIN_URL}/articles/${created.id}`);

  await page.getByLabel("Summary").fill(summary);
  await expect(page.locator(".saveindicator.ok")).toHaveText(/^Saved /, {
    timeout: 10_000,
  });

  // The save was quiet but durable: after a reload the editor still has it.
  await page.reload();
  await expect(page.getByLabel("Summary")).toHaveValue(summary);
});

test("restoring a revision leaves the editor editable", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const originalTitle = `E2E Restore ${stamp}`;
  const created = await createDraft(
    request,
    originalTitle,
    `e2e-restore-${stamp}`,
  );

  const updated = await request.patch(
    `${API_URL}/api/v1/admin/articles/${created.id}`,
    {
      headers: adminHeaders(true),
      data: {
        title: `${originalTitle} updated`,
        body: `<p>Updated body ${stamp}.</p>`,
      },
    },
  );
  expect(updated.status(), await updated.text()).toBe(200);

  await signIn(page);
  await page.goto(`${ADMIN_URL}/articles/${created.id}`);

  const version1 = page.locator(".revitem").filter({
    has: page.locator(".revver", { hasText: /^v1$/ }),
  });
  await expect(version1).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await version1.getByRole("button", { name: "Restore" }).click();
  await expect(
    page.getByText(
      "Revision restored — a new revision was recorded on top of history.",
    ),
  ).toBeVisible();

  const title = page.getByLabel("Title", { exact: true });
  await expect(title).toHaveValue(originalTitle);
  // The body must restore too, not only the metadata (the editor used to
  // keep showing the current body after a restore).
  await expect(page.locator(".tiptap")).toContainText(
    `E2E Restore ${stamp} e2e body.`,
  );

  // Typing after a restore must still drive the form and autosave.
  const editedTitle = `${originalTitle} edited`;
  await title.fill(editedTitle);
  await expect(title).toHaveValue(editedTitle);
  await expect(page.locator(".saveindicator.ok")).toHaveText(/^Saved /, {
    timeout: 10_000,
  });
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    editedTitle,
  );
});

test("uploading while on page 2 returns to the new image on page 1", async ({
  page,
}) => {
  const stamp = Date.now();
  const fixturePrefix = `e2e-media-${stamp}-`;
  let uploadedId: string | null = null;

  sql(
    `INSERT INTO media_assets (storage_key, mime_type, byte_size) VALUES ${Array.from(
      { length: 13 },
      (_, i) => `('${fixturePrefix}${i}', 'image/jpeg', 1)`,
    ).join(", ")};`,
  );

  try {
    await signIn(page);
    await page.goto(`${ADMIN_URL}/media`);

    const pager = page.locator(".pager-info");
    await expect(pager).toContainText("Page 1 of");
    await page.getByRole("button", { name: /Next/ }).click();
    await expect(pager).toContainText("Page 2 of");

    const complete = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/v1/admin/media/complete") &&
        res.request().method() === "POST",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-media-upload.jpg",
      mimeType: "image/jpeg",
      buffer: TINY_JPEG,
    });

    const response = await complete;
    expect(response.ok()).toBe(true);
    const asset = await response.json();
    uploadedId = asset.id;
    const filename = asset.storageKey.split("/").pop();

    await expect(page.getByText("Image uploaded.")).toBeVisible();
    await expect(pager).toContainText("Page 1 of");
    await expect(page.getByText(filename, { exact: true })).toBeVisible();
  } finally {
    sql(
      `DELETE FROM media_assets WHERE storage_key LIKE '${fixturePrefix}%'${
        uploadedId ? ` OR id = '${uploadedId}'` : ""
      };`,
    );
  }
});
