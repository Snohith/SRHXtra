import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Root directory for locally stored media (served at /uploads/*). */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), "uploads");
}

export function ensureUploadsDir(): string {
  const dir = uploadsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
