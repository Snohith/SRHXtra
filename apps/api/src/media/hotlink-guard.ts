import type { NextFunction, Request, Response } from "express";

/**
 * Hotlink guard for locally served media (`/uploads/*`).
 *
 * The web app protects its optimized `/_next/image` URLs with the same
 * policy (apps/web/middleware.ts); this mirrors it for the originals, so
 * a third-party page cannot embed API media directly either. Rules:
 *
 * - No Referer → allowed (server-side fetches, OG crawlers, direct visits).
 * - `sec-fetch-site: cross-site` → blocked.
 * - Referer host = request host (same origin) or an allowlisted browser
 *   origin (CORS_ORIGINS + the canonical site URL) → allowed.
 * - Anything else → 403.
 *
 * A scripted client can spoof both headers; like every hotlink guard this
 * raises the effort, it does not enforce.
 */
export function hotlinkGuard(allowedOrigins: string[]) {
  const allowedHosts = new Set<string>();
  for (const origin of allowedOrigins) {
    try {
      allowedHosts.add(new URL(origin).hostname.toLowerCase());
    } catch {
      /* A malformed CORS_ORIGINS entry must not widen the guard. */
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.headers["sec-fetch-site"] === "cross-site") {
      deny(res);
      return;
    }

    const referer = req.headers.referer;
    if (!referer) {
      next();
      return;
    }

    let refererHost: string;
    try {
      refererHost = new URL(referer).hostname.toLowerCase();
    } catch {
      deny(res);
      return;
    }

    const ownHost = (req.headers.host ?? "").split(":")[0].toLowerCase();
    if (refererHost === ownHost || allowedHosts.has(refererHost)) {
      next();
      return;
    }
    deny(res);
  };
}

function deny(res: Response): void {
  res
    .status(403)
    .set("Cache-Control", "no-store")
    .type("text/plain")
    .send("Hotlinking is not permitted.");
}
