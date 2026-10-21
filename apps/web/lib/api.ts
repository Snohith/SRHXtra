import {
  ArticleSchema,
  CategorySchema,
  PaginatedArticlesSchema,
  type Article,
  type Category,
} from "@srh/contracts";

/** API origin (server use). NEXT_PUBLIC_API_URL is shared with the browser. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Canonical site origin for SEO (canonical URLs, OG tags, sitemap). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function articleUrl(slug: string): string {
  return `${SITE_URL}/news/${slug}`;
}

/**
 * Same allowlist next.config.mjs gives the image optimizer. A cover on any
 * other host would make Next/Image throw at render time (500 page), so treat
 * it as "no cover" instead.
 */
const IMAGE_ORIGINS = (() => {
  const origins = new Set<string>();
  for (const raw of [
    API_BASE,
    SITE_URL,
    ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(","),
  ]) {
    const value = raw.trim();
    if (!value) continue;
    try {
      origins.add(
        new URL(value.includes("://") ? value : `https://${value}`).origin,
      );
    } catch {
      /* ignore malformed env entries */
    }
  }
  return origins;
})();

/** Covers may be API-relative (/uploads/…) or absolute — absolutize for <img>/OG. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) {
    return `${API_BASE}${url}`;
  }
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      IMAGE_ORIGINS.has(parsed.origin)
    ) {
      return url;
    }
  } catch {
    /* not an absolute URL */
  }
  return null;
}

/** Non-2xx API response, so callers can tell 404s from an API outage. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(
  path: string,
  schema: { parse: (v: unknown) => T },
  revalidate = 60,
  tags: string[] = ["articles"],
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate, tags },
    headers: { Accept: "application/json" },
    // A hung API must not hang the reader's page request forever.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API ${path} responded ${res.status}`);
  }
  return schema.parse(await res.json());
}

export interface FeedParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  sort?: "newest" | "oldest";
}

export async function getFeed(params: FeedParams = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 12),
    sort: params.sort ?? "newest",
  });
  if (params.category) q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  const tags = params.category
    ? ["articles", `category:${params.category}`]
    : ["articles"];
  return get(`/api/v1/articles?${q}`, PaginatedArticlesSchema, 60, tags);
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    return await get(`/api/v1/articles/${slug}`, ArticleSchema, 60, [
      "articles",
      `article:${slug}`,
    ]);
  } catch (err) {
    // A missing story is a 404; an outage or bad payload must surface as an
    // error, not as a (cached) not-found page.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCategories(): Promise<Category[]> {
  return get("/api/v1/categories", CategorySchema.array(), 300, ["categories"]);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
