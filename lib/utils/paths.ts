import path from "node:path";

export const ROOT_DIR = process.cwd();
export const CONTENT_DIR = path.join(ROOT_DIR, "content");
export const DATA_DIR = path.join(CONTENT_DIR, "data");
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");

export function resolveContentPath(...segments: string[]) {
  return path.join(CONTENT_DIR, ...segments);
}

export function resolveDataPath(fileName: string) {
  return path.join(DATA_DIR, fileName);
}

export function normalizeLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

export function normalizeBasePath(value?: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function withBasePath(value: string, basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return value;
  }

  if (!basePath) {
    return value;
  }

  return `${basePath}${value}`;
}
