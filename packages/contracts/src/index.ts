import { z } from "zod";

/** GET /health response — must stay in sync with apps/api health controller. */
export const HealthCheckResponseSchema = z.object({
  status: z.literal("ok"),
  db: z.enum(["up", "down"]),
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number(),
  version: z.string(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/** GET /health/db response. */
export const DbHealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  db: z.enum(["up", "down"]),
  latencyMs: z.number().optional(),
  timestamp: z.string().datetime(),
});

export type DbHealthResponse = z.infer<typeof DbHealthResponseSchema>;

/** Standard API error body. */
export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Generic paginated response helper. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ---------------------------------------------------------------------------
// Editorial domain (Step 2): shared API shapes for articles.
// DB is the source of truth; these schemas describe the HTTP contract.
// ---------------------------------------------------------------------------

export const ArticleStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED"]);
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

export const RoleNameSchema = z.enum(["admin", "editor", "writer", "publisher"]);
export type RoleName = z.infer<typeof RoleNameSchema>;

/** Single article as returned by public + admin endpoints. */
export const ArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  body: z.string(),
  status: ArticleStatusSchema,
  authorId: z.string().uuid(),
  authorName: z.string().nullable(),
  categoryId: z.number().int().nullable(),
  categorySlug: z.string().nullable(),
  categoryName: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Article = z.infer<typeof ArticleSchema>;

export const CreateArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase alphanumeric with hyphens")
    .optional(),
  excerpt: z.string().max(2000).optional(),
  body: z.string().min(1),
  categoryId: z.number().int().positive().optional(),
});
export type CreateArticle = z.infer<typeof CreateArticleSchema>;

export const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase alphanumeric with hyphens")
    .optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
});
export type UpdateArticle = z.infer<typeof UpdateArticleSchema>;

export const PublicArticlesQuerySchema = PaginationQuerySchema.extend({
  category: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(200).optional(),
});
export type PublicArticlesQuery = z.infer<typeof PublicArticlesQuerySchema>;

export const AdminArticlesQuerySchema = PaginationQuerySchema.extend({
  status: ArticleStatusSchema.optional(),
  search: z.string().min(1).max(200).optional(),
});
export type AdminArticlesQuery = z.infer<typeof AdminArticlesQuerySchema>;

export const PaginatedArticlesSchema = z.object({
  data: z.array(ArticleSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type PaginatedArticles = z.infer<typeof PaginatedArticlesSchema>;
