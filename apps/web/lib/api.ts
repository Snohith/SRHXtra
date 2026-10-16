import {
  ArticleSchema,
  CategorySchema,
  PaginatedArticlesSchema,
  type Article,
  type Category,
} from "@srh/contracts";

/** API origin (server use). NEXT_PUBLIC_API_URL is shared with the browser. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Canonical site origin for SEO (canonical URLs, OG tags, sitemap). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function articleUrl(slug: string): string {
  return `${SITE_URL}/news/${slug}`;
}

/** Covers may be API-relative (/uploads/…) or absolute — absolutize for <img>/OG. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

async function get<T>(path: string, schema: { parse: (v: unknown) => T }, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API ${path} responded ${res.status}`);
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
  return get(`/api/v1/articles?${q}`, PaginatedArticlesSchema);
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    return await get(`/api/v1/articles/${slug}`, ArticleSchema);
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await get("/api/v1/categories", CategorySchema.array(), 300);
  } catch {
    return [];
  }
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
