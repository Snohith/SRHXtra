import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * On-demand revalidation webhook (Step 5).
 *
 * Called by the outbox worker after an article is published. Requires the
 * shared REVALIDATE_SECRET and is rate limited (in-memory; single replica).
 * Invalidates the tag-based data caches plus the concrete routes, so readers
 * see the new article immediately instead of waiting for the ISR window.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret";
const WINDOW_MS = 60_000;
const MAX_HITS = 120;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, value] of hits) {
      if (value.every((t) => now - t > WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_HITS;
}

function secretMatches(provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(SECRET, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!secretMatches(provided)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
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
