/**
 * Minimal AWS Signature V4 presigner for S3-compatible object storage (PUT).
 *
 * Implemented with node:crypto so the API stays dependency-light and the
 * signing logic is auditable. Verified against MinIO (see README "Signed
 * uploads"): unsigned/expired URLs get 403, signed ones upload successfully.
 *
 * Only what presigned PUT needs: host-only signed headers, UNSIGNED-PAYLOAD.
 */
import { createHash, createHmac } from "node:crypto";

export interface S3PresignConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO and most self-hosted S3 want path-style ("endpoint/bucket/key"). */
  forcePathStyle?: boolean;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/** RFC3986 encoding (encodeURIComponent leaves !'()* unescaped). */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function amzDates(now: Date): { amzDate: string; dateStamp: string } {
  const iso = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, ""); // YYYYMMDDTHHMMSSZ
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

/**
 * Build a presigned PUT URL the browser can upload to directly.
 * Returns a plain string; callers hand it to the client as-is.
 */
export function presignPutUrl(
  config: S3PresignConfig,
  key: string,
  expiresInSeconds: number,
  now: Date = new Date(),
): string {
  if (expiresInSeconds < 1 || expiresInSeconds > 604800) {
    throw new Error("expiresInSeconds must be between 1 and 604800 (7 days).");
  }
  const endpoint = config.endpoint.replace(/\/+$/, "");
  const forcePathStyle = config.forcePathStyle ?? true;
  const encodedKey = key
    .split("/")
    .map((segment) => rfc3986(segment))
    .join("/");

  const url = new URL(endpoint);
  url.pathname = forcePathStyle
    ? `${url.pathname.replace(/\/+$/, "")}/${rfc3986(config.bucket)}/${encodedKey}`
    : `/${encodedKey}`;

  const host = url.host;
  const { amzDate, dateStamp } = amzDates(now);
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalQuery = [...query.entries()]
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .sort()
    .join("&");

  const canonicalRequest = [
    "PUT",
    url.pathname,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region),
      "s3",
    ),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}
