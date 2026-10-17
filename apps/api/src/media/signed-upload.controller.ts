import {
  BadRequestException,
  Controller,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { MediaService } from "./media.service";
import { StorageService } from "./storage.service";

/**
 * Signed direct-upload receiver (Step 5, local storage driver).
 *
 * Deliberately NOT behind AdminAuthGuard: the HMAC-signed token in the URL is
 * the credential (like an S3 presigned URL). It is scoped to one storage key,
 * one MIME type, one byte cap, one intent row, and a 10-minute expiry —
 * and every rejected case (bad signature, expiry, used intent, wrong
 * content-type, oversize) fails before anything touches disk.
 */
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller("api/v1/media")
export class SignedUploadController {
  constructor(
    private readonly storage: StorageService,
    private readonly media: MediaService,
  ) {}

  @Put("put")
  async put(@Query("token") token: string | undefined, @Req() req: Request) {
    if (!token) throw new UnauthorizedException("Missing upload token.");
    const claims = this.storage.verifyUploadToken(token);
    if (!claims) throw new UnauthorizedException("Invalid or expired upload token.");

    const intent = await this.media.getUsableIntent(claims.intentId, claims.key);
    if (!intent) throw new BadRequestException("Upload intent expired or already completed.");

    const headerType = String(req.headers["content-type"] ?? "")
      .split(";")[0]
      .trim();
    if (headerType !== claims.contentType) {
      throw new BadRequestException(`Content-Type must be ${claims.contentType}.`);
    }

    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > claims.maxBytes) {
      throw new BadRequestException("Content-Length exceeds the signed size cap.");
    }

    const written = await this.media.streamLocalUpload(req, claims.key, claims.maxBytes);
    await this.media.markUploaded(claims.intentId);
    return {
      key: claims.key,
      publicUrl: this.storage.publicUrlFor(claims.key),
      byteSize: written,
    };
  }
}
