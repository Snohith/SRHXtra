import { Injectable, Logger } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { extname, join } from "node:path";
import { uploadsDir } from "./uploads";
import { presignPutUrl } from "./s3-signer";

export type StorageProvider = "local" | "s3";

export interface UploadSignature {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  publicUrl: string;
  provider: StorageProvider;
  expiresAt: string;
}

export interface UploadTokenClaims {
  key: string;
  contentType: string;
  maxBytes: number;
  intentId: string;
  actorId: string;
  expiresAtMs: number;
}

/**
 * Storage abstraction for media (Step 5).
 *
 * - `local` (default): files land on disk; uploads go through the API's own
 *   HMAC-signed URL (`PUT /api/v1/media/put?token=…`) — no multipart, and the
 *   URL is scoped to one key, one MIME type, one size cap, and ~10 minutes.
 * - `s3`: presigned PUT URLs (SigV4) for S3/MinIO; the browser uploads
 *   straight to object storage and never round-trips bytes through the API.
 *
 * Both paths are "signed object-storage URLs"; switching is an env change.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  readonly provider: StorageProvider;
  private readonly signingSecret: string;
  private readonly apiPublicUrl: string;

  constructor() {
    this.provider = process.env.MEDIA_DRIVER === "s3" ? "s3" : "local";
    this.signingSecret =
      process.env.MEDIA_SIGNING_SECRET ?? process.env.ADMIN_API_TOKEN ?? "dev-media-signing-secret";
    this.apiPublicUrl = (process.env.API_PUBLIC_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  }

  /** Opaque, collision-resistant key: uploads/2026/10/<random>.jpg */
  buildStorageKey(originalFilename: string): string {
    const rawExt = extname(originalFilename).toLowerCase();
    const ext = /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : ".bin";
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `uploads/${now.getUTCFullYear()}/${month}/${randomBytes(10).toString("hex")}${ext}`;
  }

  /** Sign an upload scoped to the given key/content-type/size/actor. */
  signUpload(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
    actorId: string;
    expiresAt: Date;
  }): UploadSignature {
    const expiresAt = input.expiresAt.toISOString();
    if (this.provider === "s3") {
      const config = this.s3Config();
      const expiresInSeconds = Math.max(
        60,
        Math.floor((input.expiresAt.getTime() - Date.now()) / 1000),
      );
      const uploadUrl = presignPutUrl(config, input.key, expiresInSeconds);
      return {
        uploadUrl,
        method: "PUT",
        headers: { "Content-Type": input.contentType },
        publicUrl: this.publicUrlFor(input.key),
        provider: "s3",
        expiresAt,
      };
    }

    const claims: UploadTokenClaims = {
      key: input.key,
      contentType: input.contentType,
      maxBytes: input.maxBytes,
      intentId: input.intentId,
      actorId: input.actorId,
      expiresAtMs: input.expiresAt.getTime(),
    };
    const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
    const signature = this.hmac(payload);
    const token = `${payload}.${signature}`;
    return {
      uploadUrl: `${this.apiPublicUrl}/api/v1/media/put?token=${encodeURIComponent(token)}`,
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      publicUrl: this.publicUrlFor(input.key),
      provider: "local",
      expiresAt,
    };
  }

  /** Verify a local upload token; null when tampered, malformed, or expired. */
  verifyUploadToken(token: string): UploadTokenClaims | null {
    const dot = token.lastIndexOf(".");
    if (dot <= 0) return null;
    const payload = token.slice(0, dot);
    const provided = token.slice(dot + 1);
    const expected = this.hmac(payload);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadTokenClaims;
      if (
        typeof claims.key !== "string" ||
        typeof claims.contentType !== "string" ||
        typeof claims.maxBytes !== "number" ||
        typeof claims.intentId !== "string" ||
        typeof claims.actorId !== "string" ||
        typeof claims.expiresAtMs !== "number"
      ) {
        return null;
      }
      if (Date.now() > claims.expiresAtMs) return null;
      return claims;
    } catch {
      return null;
    }
  }

  /** Disk path for a local storage key (`uploads/2026/10/x.jpg`). */
  localFilePath(key: string): string {
    return join(uploadsDir(), key.replace(/^uploads\//, ""));
  }

  /** Site-relative (/uploads/…) or absolute (CDN/S3) public URL for a key. */
  publicUrlFor(key: string): string {
    if (this.provider === "s3") {
      const base = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
      if (!base) throw new Error("S3_PUBLIC_BASE_URL is required with MEDIA_DRIVER=s3.");
      return `${base}/${key}`;
    }
    return `/${key}`;
  }

  private s3Config() {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "MEDIA_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY.",
      );
    }
    return {
      endpoint,
      region: process.env.S3_REGION ?? "us-east-1",
      bucket,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") !== "false",
    };
  }

  private hmac(payload: string): string {
    return createHmac("sha256", this.signingSecret).update(payload, "utf8").digest("hex");
  }
}
