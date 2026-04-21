import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function resolveProjectPath(...segments) {
  return path.join(projectRoot, ...segments);
}

export function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(value) {
  return cleanString(String(value ?? ""))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function stripTags(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
}

export function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function logSection(title) {
  console.log(`\n[official-sync] ${title}`);
}

export function logList(prefix, entries) {
  for (const entry of entries) {
    console.log(`${prefix}${entry}`);
  }
}

export function stableJsonStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function stableText(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function ensureParentDirectory(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeTextFileIfChanged(filePath, nextValue, options = {}) {
  const { dryRun = false, label = filePath } = options;
  const previousValue = existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
  const nextText = stableText(nextValue);

  if (previousValue === nextText) {
    console.log(`[official-sync] No changes in ${label}`);
    return false;
  }

  if (dryRun) {
    console.log(`[official-sync] Dry run: would update ${label}`);
    return true;
  }

  ensureParentDirectory(filePath);
  writeFileSync(filePath, nextText, "utf8");
  console.log(`[official-sync] Updated ${label}`);
  return true;
}

export function writeJsonFileIfChanged(filePath, nextValue, options = {}) {
  const { dryRun = false, label = filePath } = options;
  const previousValue = readJsonIfExists(filePath);

  if (previousValue && isDeepStrictEqual(previousValue, nextValue)) {
    console.log(`[official-sync] No changes in ${label}`);
    return false;
  }

  if (dryRun) {
    console.log(`[official-sync] Dry run: would update ${label}`);
    return true;
  }

  ensureParentDirectory(filePath);
  writeFileSync(filePath, stableJsonStringify(nextValue), "utf8");
  console.log(`[official-sync] Updated ${label}`);
  return true;
}

export function removeFileIfExists(filePath, options = {}) {
  const { dryRun = false } = options;

  if (!existsSync(filePath)) {
    return false;
  }

  if (dryRun) {
    console.log(`[official-sync] Dry run: would remove ${filePath}`);
    return true;
  }

  rmSync(filePath);
  console.log(`[official-sync] Removed ${filePath}`);
  return true;
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "SRHXtra official sync/1.0 (+https://github.com/)",
      accept: options.accept ?? "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  if (!text.trim()) {
    throw new Error("Empty response body");
  }

  return text;
}

export function parseJsonp(payload, callbackName) {
  const trimmed = payload.trim().replace(/^\uFEFF/, "");
  const matcher = callbackName
    ? new RegExp(`^${callbackName}\\((([\\s\\S])*?)\\);?$`)
    : /^(\w+)\(([\s\S]*?)\);?$/;
  const match = trimmed.match(matcher);

  if (!match) {
    throw new Error(`Unexpected JSONP payload${callbackName ? ` for ${callbackName}` : ""}`);
  }

  const jsonText = callbackName ? match[1] : match[2];
  return JSON.parse(jsonText);
}

export async function fetchJsonp(url, callbackName) {
  const payload = await fetchText(url, { accept: "*/*" });
  return parseJsonp(payload, callbackName);
}

export function toIsoDateString(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).toISOString();
}

export function parseDateToIso(value, options = {}) {
  const normalized = cleanString(value).replace(/,/g, "");
  const parts = normalized.split(" ").filter(Boolean);
  const fallbackYear = options.fallbackYear ?? new Date().getUTCFullYear();

  if (parts.length >= 3 && /^\d{1,2}$/.test(parts[0])) {
    const day = Number(parts[0]);
    const month = MONTHS[parts[1].toLowerCase()];
    const year = Number(parts[2]);

    if (month !== undefined && Number.isFinite(year)) {
      return toIsoDateString(year, month, day);
    }
  }

  if (parts.length >= 2 && MONTHS[parts[0].toLowerCase()] !== undefined && /^\d{1,2}$/.test(parts[1])) {
    const month = MONTHS[parts[0].toLowerCase()];
    const day = Number(parts[1]);
    const year = /^\d{4}$/.test(parts[2] ?? "") ? Number(parts[2]) : fallbackYear;
    return toIsoDateString(year, month, day);
  }

  throw new Error(`Unsupported date format: ${value}`);
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function absoluteUrl(href, baseUrl) {
  return new URL(href, baseUrl).toString();
}

export function parseArgs(argv) {
  const args = {
    dryRun: false,
    season: undefined,
    slug: undefined,
    allowOverwriteVerified: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (argument === "--season" && argv[index + 1]) {
      args.season = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith("--season=")) {
      args.season = argument.split("=")[1];
      continue;
    }

    if (argument === "--slug" && argv[index + 1]) {
      args.slug = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith("--slug=")) {
      args.slug = argument.split("=")[1];
      continue;
    }

    if (argument === "--allow-overwrite-verified") {
      args.allowOverwriteVerified = true;
    }
  }

  return args;
}
