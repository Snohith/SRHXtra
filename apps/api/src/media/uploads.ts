import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Root directory for locally stored media (served at /uploads/*).
 *
 * Defaults to <repo>/uploads regardless of the process cwd: the compiled
 * location is apps/api/dist/media/uploads.js, so ../../.. is the repo root.
 * (`nest start` runs with cwd=apps/api while manual runs use the repo root —
 * a cwd-relative default would silently serve an empty directory.)
 * Override with UPLOADS_DIR in production (e.g. a mounted volume).
 */
export function uploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  return resolve(__dirname, "..", "..", "..", "..", "uploads");
}

export function ensureUploadsDir(): string {
  const dir = uploadsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
