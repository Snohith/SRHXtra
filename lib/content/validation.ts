export type EditorialStatus = "verified" | "replace-before-launch" | "draft-review";

function getLocation(filePath: string, field: string) {
  return `${filePath} -> ${field}`;
}

export function assertRequiredString(value: unknown, field: string, filePath: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required string field: ${getLocation(filePath, field)}`);
  }

  return value.trim();
}

export function assertRequiredDateString(value: unknown, field: string, filePath: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  throw new Error(`Missing required date field: ${getLocation(filePath, field)}`);
}

export function assertRequiredStringArray(value: unknown, field: string, filePath: string) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`Missing required string array field: ${getLocation(filePath, field)}`);
  }

  return value.map((entry) => entry.trim());
}

export function assertEditorialStatus(value: unknown, filePath: string): EditorialStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "verified" || value === "replace-before-launch" || value === "draft-review") {
    return value;
  }

  throw new Error(
    `Invalid editorialStatus in ${filePath}. Use "verified", "replace-before-launch", or "draft-review".`,
  );
}
