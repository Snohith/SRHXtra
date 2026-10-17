import {
  ActivityItemSchema,
  AdminStatsSchema,
  ArticleSchema,
  CategorySchema,
  MediaAssetSchema,
  PaginatedArticlesSchema,
  StaffUserSchema,
  UploadTicketSchema,
  type ActivityItem,
  type AdminStats,
  type Article,
  type Category,
  type MediaAsset,
  type StaffUser,
} from "@srh/contracts";
import type { z } from "zod";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "srh-admin-token";
const USER_KEY = "srh-admin-user";

export function getStoredAuth(): {
  token: string | null;
  userId: string | null;
} {
  if (typeof window === "undefined") return { token: null, userId: null };
  return {
    token: window.localStorage.getItem(TOKEN_KEY),
    userId: window.localStorage.getItem(USER_KEY),
  };
}

export function storeAuth(token: string, userId: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, userId);
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const { token, userId } = getStoredAuth();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (userId) headers["x-admin-user-id"] = userId;
  return headers;
}

function parseApiError(status: number, body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: string | string[] }).message;
    return Array.isArray(m) ? m.join("; ") : String(m);
  }
  return `Request failed (${status}).`;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, parseApiError(res.status, body));
  return schema.parse(body);
}

async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return request(path, schema);
}

async function send<T>(
  path: string,
  schema: z.ZodType<T>,
  method: string,
  data?: unknown,
): Promise<T> {
  return request(path, schema, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  body: string;
  categoryId?: number | null;
  coverImageUrl?: string | null;
}

function toPayload(input: ArticleInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: input.title,
    body: input.body,
  };
  if (input.slug) payload.slug = input.slug;
  if (input.excerpt !== undefined) payload.excerpt = input.excerpt || null;
  if (input.categoryId !== undefined) payload.categoryId = input.categoryId;
  if (input.coverImageUrl !== undefined)
    payload.coverImageUrl = input.coverImageUrl || null;
  return payload;
}

export const api = {
  me(): Promise<StaffUser> {
    return get("/api/v1/admin/me", StaffUserSchema);
  },
  stats(): Promise<AdminStats> {
    return get("/api/v1/admin/stats", AdminStatsSchema);
  },
  activity(limit = 10): Promise<ActivityItem[]> {
    return get(
      `/api/v1/admin/activity?limit=${limit}`,
      ActivityItemSchema.array(),
    );
  },
  categories(): Promise<Category[]> {
    return get("/api/v1/admin/categories", CategorySchema.array());
  },
  adminArticles(params: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<{
    data: Article[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const q = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    return get(`/api/v1/admin/articles?${q}`, PaginatedArticlesSchema);
  },
  getArticle(id: string): Promise<Article> {
    return get(`/api/v1/admin/articles/${id}`, ArticleSchema);
  },
  createArticle(input: ArticleInput): Promise<Article> {
    return send(
      "/api/v1/admin/articles",
      ArticleSchema,
      "POST",
      toPayload(input),
    );
  },
  updateArticle(id: string, input: ArticleInput): Promise<Article> {
    return send(
      `/api/v1/admin/articles/${id}`,
      ArticleSchema,
      "PATCH",
      toPayload(input),
    );
  },
  submitArticle(id: string): Promise<Article> {
    return send(`/api/v1/admin/articles/${id}/submit`, ArticleSchema, "POST");
  },
  publishArticle(id: string): Promise<Article> {
    return send(`/api/v1/admin/articles/${id}/publish`, ArticleSchema, "POST");
  },
  /**
   * Signed direct upload (Step 5): ask the API for a scoped PUT ticket,
   * send the bytes straight to storage (local disk or S3), then finalize.
   * The legacy multipart endpoint stays server-side for compatibility.
   */
  async uploadImage(file: File): Promise<MediaAsset> {
    const ticket = await send(
      "/api/v1/admin/media/sign",
      UploadTicketSchema,
      "POST",
      {
        filename: file.name || "upload.jpg",
        contentType: file.type || "application/octet-stream",
        size: file.size,
      },
    );
    const put = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.headers,
      body: file,
    });
    if (!put.ok) {
      const text = await put.text().catch(() => "");
      throw new ApiError(
        put.status,
        `Upload to storage failed (${put.status})${text ? `: ${text.slice(0, 120)}` : ""}`,
      );
    }
    const asset = await send(
      "/api/v1/admin/media/complete",
      MediaAssetSchema,
      "POST",
      {
        intentId: ticket.intentId,
        size: file.size,
      },
    );
    // The API returns a site-relative path (/uploads/...) — absolutize for <img>.
    if (asset.url.startsWith("/"))
      return { ...asset, url: `${API_BASE}${asset.url}` };
    return asset;
  },
};

/** Absolute URL for a stored cover image (API may return a /uploads/... path). */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}
