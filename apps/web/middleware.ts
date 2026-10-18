import { NextRequest, NextResponse } from "next/server";

/**
 * Hotlink guard for the image optimizer (`/_next/image`).
 *
 * Blocks third-party sites that embed our optimized URLs directly
 * (`<img src="https://…/_next/image?url=…">`), which would otherwise draw
 * our bandwidth and potentially misattribute the media.
 *
 * Passes through: same-origin page loads, direct visits (no Referer),
 * server-side fetch (next/image itself, OG crawlers, this repo's own
 * security checks). Blocks: explicit cross-site requests and any Referer
 * from a host that is neither the request's own host nor explicitly
 * allowlisted. Deterministic scripts can spoof Referer with curl — this
 * guard stops casual embedding, nothing more.
 *
 * Platform note: Next 14's self-hosted `next start` serves `/_next/image`
 * through an asset fast path that never reaches middleware (verified on
 * 14.2.35), so there this guard is inert and hotlink enforcement belongs to
 * the reverse proxy (see README "Copy protection"). Where middleware runs
 * before image serving (e.g. Vercel), it applies as written.
 */

/** Extra hostnames whose pages may still load optimized images. */
const EXTRA_ALLOWED_HOSTS = new Set(
  (process.env.IMAGE_HOTLINK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);

function forbidden(): NextResponse {
  return new NextResponse("Hotlinking is not permitted.", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}

export function middleware(request: NextRequest): NextResponse {
  // Development does not enforce `matcher`, so scope the guard in code as
  // well — dev and production then behave identically.
  if (!request.nextUrl.pathname.startsWith("/_next/image")) {
    return NextResponse.next();
  }

  // Browsers label cross-site subresource requests explicitly.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return forbidden();
  }

  const referer = request.headers.get("referer");
  if (!referer) return NextResponse.next(); // direct visit / server-side fetch

  let refererHost: string;
  try {
    refererHost = new URL(referer).hostname.toLowerCase();
  } catch {
    return forbidden(); // malformed Referer
  }

  const ownHost = request.nextUrl.hostname.toLowerCase();
  if (refererHost === ownHost || EXTRA_ALLOWED_HOSTS.has(refererHost)) {
    return NextResponse.next();
  }
  return forbidden();
}

export const config = {
  matcher: ["/_next/image"],
};
