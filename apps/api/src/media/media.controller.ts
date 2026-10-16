import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { DbService } from "../db/db.service";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard";
import { AdminUser } from "../admin-auth/admin-user.decorator";
import type { StaffUser } from "../users/users.service";

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * Featured-image uploads for the admin editor.
 * Files land on local disk (MVP; object storage later) and are recorded in
 * media_assets with dimensions left null — served back at /uploads/*.
 */
@UseGuards(AdminAuthGuard)
@Controller("api/v1/admin/media")
export class MediaController {
  constructor(private readonly db: DbService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = uploadsDir();
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || ".bin";
          cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
        },
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(new BadRequestException("Only JPEG/PNG/WebP/GIF/AVIF images are accepted."), false);
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
    if (!file) throw new BadRequestException("No image file provided (field: file).");
    const storageKey = `uploads/${file.filename}`;
    const url = `/uploads/${file.filename}`;
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO media_assets (storage_key, mime_type, byte_size, alt_text, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [storageKey, file.mimetype, file.size, null, actor.id],
    );
    return {
      id: rows[0].id,
      storageKey,
      url,
      mimeType: file.mimetype,
      byteSize: file.size,
      width: null,
      height: null,
      altText: null,
    };
  }
}
