import { expect, test } from "@playwright/test";
import { request as httpRequest } from "node:http";
import { readdirSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";

import { API_URL, REPO_ROOT, TINY_JPEG, adminHeaders, sql } from "./helpers";

/**
 * Regression coverage for the legacy multipart upload path. These cases were
 * added with the Multer 2.4 migration: Nest 10 does not translate Multer's
 * newer client-error codes by itself, and a failed/aborted upload must not
 * leave a file or a media row behind.
 */

const UPLOAD_ENDPOINT = `${API_URL}/api/v1/admin/media`;
const UPLOADS_DIR = resolve(REPO_ROOT, "uploads");

function uploadFiles(): string[] {
  try {
    return readdirSync(UPLOADS_DIR).sort();
  } catch {
    return [];
  }
}

function removeFixture(assetId: string, storageKey: string): void {
  sql(`DELETE FROM media_assets WHERE id = '${assetId}';`);
  rmSync(resolve(UPLOADS_DIR, basename(storageKey)), { force: true });
}

test("legacy multipart upload enforces field, index, size, and MIME limits", async ({
  request,
}) => {
  const valid = await request.post(UPLOAD_ENDPOINT, {
    headers: adminHeaders(),
    multipart: {
      file: { name: "tiny.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG },
    },
  });
  expect(valid.status(), await valid.text()).toBe(201);
  const asset = (await valid.json()) as {
    id: string;
    storageKey: string;
    mimeType: string;
  };
  expect(asset.mimeType).toBe("image/jpeg");

  try {
    const tooManyFields = await request.post(UPLOAD_ENDPOINT, {
      headers: adminHeaders(),
      multipart: {
        a: "1",
        b: "2",
        c: "3",
        d: "4",
        e: "5",
        file: { name: "tiny.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG },
      },
    });
    expect(tooManyFields.status()).toBe(400);

    const largeArrayIndex = await request.post(UPLOAD_ENDPOINT, {
      headers: adminHeaders(),
      multipart: {
        "a[101]": "x",
        file: { name: "tiny.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG },
      },
    });
    expect(largeArrayIndex.status()).toBe(400);

    const longFieldName = await request.post(UPLOAD_ENDPOINT, {
      headers: adminHeaders(),
      multipart: {
        ["x".repeat(250)]: "x",
        file: { name: "tiny.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG },
      },
    });
    expect(longFieldName.status()).toBe(400);

    const wrongMime = await request.post(UPLOAD_ENDPOINT, {
      headers: adminHeaders(),
      multipart: {
        file: {
          name: "not-an-image.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        },
      },
    });
    expect(wrongMime.status()).toBe(400);

    const tooLarge = await request.post(UPLOAD_ENDPOINT, {
      headers: adminHeaders(),
      multipart: {
        file: {
          name: "large.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
        },
      },
    });
    expect(tooLarge.status()).toBe(413);
  } finally {
    removeFixture(asset.id, asset.storageKey);
  }
});

test("an aborted multipart upload leaves no file or media row", async ({
  request,
}) => {
  const beforeFiles = uploadFiles();
  const beforeRows = Number(sql("SELECT COUNT(*) FROM media_assets;") || "0");
  const boundary = `----e2e-abort-${Date.now()}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="aborted.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`,
  );

  await new Promise<void>((resolvePromise) => {
    const req = httpRequest(
      new URL(UPLOAD_ENDPOINT),
      {
        method: "POST",
        headers: {
          ...adminHeaders(),
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          // Deliberately longer than the bytes sent, then destroy the socket.
          "Content-Length": String(head.length + TINY_JPEG.length + 128),
        },
      },
      () => {
        /* response is irrelevant: the connection is cut mid-body */
      },
    );
    req.on("error", () => resolvePromise());
    req.on("close", () => resolvePromise());
    req.write(head);
    req.write(TINY_JPEG.subarray(0, 64));
    setTimeout(() => {
      req.destroy();
      resolvePromise();
    }, 100);
  });

  // Multer removes a partial file asynchronously after the socket closes.
  await expect
    .poll(() => uploadFiles(), { timeout: 5_000 })
    .toEqual(beforeFiles);
  expect(Number(sql("SELECT COUNT(*) FROM media_assets;") || "0")).toBe(
    beforeRows,
  );

  // The API must still be healthy after the interrupted request.
  const health = await request.get(`${API_URL}/api/v1/health`);
  expect(health.status()).toBe(200);
});
