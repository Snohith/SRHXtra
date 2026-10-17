import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import type { Request } from "express";
import { DbService } from "../db/db.service";
import type { StaffUser } from "../users/users.service";
import { StorageService } from "./storage.service";

/** One source of truth for upload limits (multipart + signed paths). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export interface UploadIntentRow {
  id: string;
  storage_key: string;
  mime_type: string;
  max_bytes: number;
  provider: "local" | "s3";
  created_by: string | null;
  uploaded_at: string | null;
  expires_at: string;
  completed_at: string | null;
}

export interface MediaAssetDto {
  id: string;
  storageKey: string;
  url: string;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  altText: string | null;
}

const INTENT_TTL_MS = 10 * 60_000;

/**
 * Media business logic shared by the admin-facing multipart/sign endpoints
 * and the public signed-upload receiver.
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
  ) {}

  /** Admin requests a signed upload ticket for one file. */
  async createUploadIntent(
    input: { filename: string; contentType: string; size: number },
    actor: StaffUser,
  ) {
    if (!ALLOWED_UPLOAD_MIME.has(input.contentType)) {
      throw new BadRequestException("Only JPEG/PNG/WebP/GIF/AVIF images are accepted.");
    }
    if (input.size < 1 || input.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`Image must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`);
    }
    const key = this.storage.buildStorageKey(input.filename);
    const expiresAt = new Date(Date.now() + INTENT_TTL_MS);
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO media_upload_intents (storage_key, mime_type, max_bytes, provider, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [key, input.contentType, input.size, this.storage.provider, actor.id, expiresAt],
    );
    const intentId = rows[0].id;
    const signature = this.storage.signUpload({
      key,
      contentType: input.contentType,
      maxBytes: input.size,
      intentId,
      actorId: actor.id,
      expiresAt,
    });
    return {
      intentId,
      storageKey: key,
      provider: signature.provider,
      uploadUrl: signature.uploadUrl,
      method: signature.method,
      headers: signature.headers,
      publicUrl: signature.publicUrl,
      expiresAt: signature.expiresAt,
    };
  }

  /** Look up an intent that is still writable (not expired/completed). */
  async getUsableIntent(intentId: string, key: string): Promise<UploadIntentRow | null> {
    const { rows } = await this.db.query<UploadIntentRow>(
      `SELECT id, storage_key, mime_type, max_bytes, provider, created_by, uploaded_at, expires_at, completed_at
       FROM media_upload_intents
       WHERE id = $1 AND storage_key = $2 AND completed_at IS NULL AND expires_at > now()`,
      [intentId, key],
    );
    return rows[0] ?? null;
  }

  async markUploaded(intentId: string): Promise<void> {
    await this.db.query(
      `UPDATE media_upload_intents SET uploaded_at = COALESCE(uploaded_at, now()) WHERE id = $1`,
      [intentId],
    );
  }

  /**
   * Complete a signed upload: verify the bytes actually landed (local disk
   * stat; S3 trusts the signed PUT + clamps byte_size), then write the
   * media_assets row. Idempotent per storage key.
   */
  async completeUpload(
    input: { intentId: string; size?: number },
    actor: StaffUser,
  ): Promise<MediaAssetDto> {
    const { rows } = await this.db.query<UploadIntentRow>(
      `SELECT id, storage_key, mime_type, max_bytes, provider, created_by, uploaded_at, expires_at, completed_at
       FROM media_upload_intents
       WHERE id = $1 AND completed_at IS NULL AND expires_at > now()`,
      [input.intentId],
    );
    const intent = rows[0];
    if (!intent) {
      throw new BadRequestException("Upload intent not found, expired, or already completed.");
    }
    if (intent.created_by && intent.created_by !== actor.id) {
      throw new ForbiddenException("This upload intent belongs to another staff member.");
    }

    let byteSize: number | null = input.size ?? null;
    if (intent.provider === "local") {
      try {
        const info = await stat(this.storage.localFilePath(intent.storage_key));
        byteSize = info.size;
      } catch {
        throw new BadRequestException("Uploaded file not found on storage — did the PUT succeed?");
      }
    }
    if (byteSize !== null && byteSize > intent.max_bytes) {
      throw new PayloadTooLargeException("Uploaded object exceeds the signed size cap.");
    }

    const asset = await this.db.query<{
      id: string;
      storage_key: string;
      mime_type: string | null;
      byte_size: number | null;
      width: number | null;
      height: number | null;
      alt_text: string | null;
    }>(
      `INSERT INTO media_assets (storage_key, mime_type, byte_size, alt_text, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (storage_key) DO UPDATE SET mime_type = EXCLUDED.mime_type, byte_size = EXCLUDED.byte_size
       RETURNING id, storage_key, mime_type, byte_size, width, height, alt_text`,
      [intent.storage_key, intent.mime_type, byteSize, null, actor.id],
    );
    await this.db.query(
      `UPDATE media_upload_intents SET completed_at = now(), uploaded_at = COALESCE(uploaded_at, now()) WHERE id = $1`,
      [intent.id],
    );
    const row = asset.rows[0];
    return {
      id: row.id,
      storageKey: row.storage_key,
      url: this.storage.publicUrlFor(row.storage_key),
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      width: row.width,
      height: row.height,
      altText: row.alt_text,
    };
  }

  /**
   * Stream a raw PUT body to local storage with a hard byte cap.
   * Writes to a temp file first so a partial/failed upload never becomes a
   * publicly served object.
   */
  async streamLocalUpload(req: Request, key: string, maxBytes: number): Promise<number> {
    const target = this.storage.localFilePath(key);
    const tmp = `${target}.part-${randomBytes(4).toString("hex")}`;
    await mkdir(dirname(target), { recursive: true });

    let written = 0;
    let settled = false;
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(tmp);
      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        out.destroy();
        void rm(tmp, { force: true }).catch(() => undefined);
        reject(err);
      };
      req.on("data", (chunk: Buffer) => {
        written += chunk.length;
        if (written > maxBytes) {
          req.destroy();
          fail(new PayloadTooLargeException("Uploaded object exceeds the signed size cap."));
        }
      });
      req.on("error", fail);
      out.on("error", fail);
      out.on("finish", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      req.pipe(out);
    });

    await rename(tmp, target);
    return written;
  }

  /** Record an asset for the legacy multipart path (already on disk). */
  async recordUploadedFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    actorId: string | null;
  }): Promise<MediaAssetDto> {
    const storageKey = `uploads/${input.filename}`;
    const { rows } = await this.db.query<{
      id: string;
      storage_key: string;
      mime_type: string | null;
      byte_size: number | null;
      width: number | null;
      height: number | null;
      alt_text: string | null;
    }>(
      `INSERT INTO media_assets (storage_key, mime_type, byte_size, alt_text, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, storage_key, mime_type, byte_size, width, height, alt_text`,
      [storageKey, input.mimeType, input.size, null, input.actorId],
    );
    const row = rows[0];
    return {
      id: row.id,
      storageKey: row.storage_key,
      url: `/${row.storage_key}`,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      width: row.width,
      height: row.height,
      altText: row.alt_text,
    };
  }
}
