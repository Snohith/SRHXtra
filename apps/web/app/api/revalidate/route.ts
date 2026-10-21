import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * On-demand revalidation webhook (Step 5).
 *
 * Called by the outbox worker after an article changes. Requires the shared
 * REVALIDATE_SECRET; that secret is the gate (the platform/proxy owns rate
 * limiting — an in-route limiter keyed on a client-settable
 * `x-forwarded-for` header was security theatre).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_SECRET = "dev-revalidate-secret";
let warnedUnconfigured = false;

/**
 * Invalid-secret attempts are limited globally (not by IP: a caller can spoof
 * X-Forwarded-For unless the edge proxy is trusted). Valid worker calls are
 * never counted. This is per-process defense-in-depth; the reverse proxy still
 * owns the real request-rate limit.
 * shortcut: per-process only — move to Redis if the web tier runs multi-instance.
 */
const INVALID_ATTEMPT_LIMIT = 30;
const INVALID_ATTEMPT_WINDOW_MS = 60_000;
let invalidWindowStarted = 0;
let invalidAttempts = 0;

function tooManyInvalidAttempts(): boolean {
  const now = Date.now();
  if (now - invalidWindowStarted >= INVALID_ATTEMPT_WINDOW_MS) {
    invalidWindowStarted = now;
    invalidAttempts = 0;
  }
  invalidAttempts += 1;
  return invalidAttempts > INVALID_ATTEMPT_LIMIT;
}

/**
 * Production refuses the documented dev secret: a deploy that forgot
 * REVALIDATE_SECRET authenticates nothing instead of accepting a value that
 * is published in this repo.
 */
function configuredSecret(): string {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && secret !== DEV_SECRET) return secret;
  if (process.env.NODE_ENV === "production") {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          service: "revalidate",
          msg: "REVALIDATE_SECRET missing or dev default in production; rejecting all webhook calls",
        }),
      );
    }
    return "";
  }
  return DEV_SECRET;
}

function secretMatches(provided: string | null): boolean {
  const expected = configuredSecret();
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!secretMatches(provided)) {
    if (tooManyInvalidAttempts()) {
      return NextResponse.json(
        { message: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: unknown;
    event?: unknown;
  };
  const slug =
    typeof body.slug === "string" && body.slug.length > 0 ? body.slug : null;

  revalidateTag("articles");
  if (slug) revalidateTag(`article:${slug}`);
  revalidatePath("/", "page");
  revalidatePath("/news", "page");
  if (slug) revalidatePath(`/news/${slug}`, "page");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({
    revalidated: true,
    event: typeof body.event === "string" ? body.event : null,
    slug,
    now: new Date().toISOString(),
  });
}
