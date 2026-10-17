import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { diskStorage } from "multer";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard";
import { AdminUser } from "../admin-auth/admin-user.decorator";
import type { StaffUser } from "../users/users.service";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  MediaService,
} from "./media.service";
import { ensureUploadsDir } from "./uploads";

export { uploadsDir } from "./uploads";

class SignUploadDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @MaxLength(100)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  size!: number;
}

class CompleteUploadDto {
  @IsString()
  @MaxLength(64)
  intentId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  size?: number;
}

/**
 * Featured-image uploads for the admin editor.
 *
 * Preferred path (Step 5): POST /sign → PUT bytes to the signed storage URL →
 * POST /complete. The legacy multipart POST / remains for compatibility.
 */
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@UseGuards(AdminAuthGuard)
@Controller("api/v1/admin/media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Issue a signed direct-upload ticket (local disk or S3, per MEDIA_DRIVER). */
  @Post("sign")
  createSignedUpload(
    @Body() dto: SignUploadDto,
    @AdminUser() actor: StaffUser,
  ) {
    return this.media.createUploadIntent(dto, actor);
  }

  /** Finalize a signed upload and record the media_assets row. */
  @Post("complete")
  completeSignedUpload(
    @Body() dto: CompleteUploadDto,
    @AdminUser() actor: StaffUser,
  ) {
    return this.media.completeUpload(dto, actor);
  }

  /** Legacy multipart upload (kept for compatibility). */
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ensureUploadsDir()),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || ".bin";
          cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_UPLOAD_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(
              "Only JPEG/PNG/WebP/GIF/AVIF images are accepted.",
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @AdminUser() actor: StaffUser,
  ) {
    if (!file)
      throw new BadRequestException("No image file provided (field: file).");
    return this.media.recordUploadedFile({
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      actorId: actor.id,
    });
  }
}
