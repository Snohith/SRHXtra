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
  coverImageUrl: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Article = z.infer<typeof ArticleSchema>;

const CoverImageUrlSchema = z.string().max(2000).optional();

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
  coverImageUrl: CoverImageUrlSchema,
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
  coverImageUrl: CoverImageUrlSchema.nullable(),
});
export type UpdateArticle = z.infer<typeof UpdateArticleSchema>;

export const PublicArticlesQuerySchema = PaginationQuerySchema.extend({
  category: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(200).optional(),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
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

// ---------------------------------------------------------------------------
// Admin dashboard (Step 3): stats, activity, categories, media, staff identity.
// ---------------------------------------------------------------------------

/** Staff user as returned by GET /api/v1/admin/me. */
export const StaffUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  status: z.string(),
  roles: z.array(RoleNameSchema),
});
export type StaffUser = z.infer<typeof StaffUserSchema>;

/** Dashboard counters — always computed from live DB rows. */
export const AdminStatsSchema = z.object({
  published: z.number().int(),
  drafts: z.number().int(),
  inReview: z.number().int(),
  total: z.number().int(),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

/** One recent admin action for the dashboard activity feed. */
export const ActivityItemSchema = z.object({
  id: z.number().int(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  articleTitle: z.string().nullable(),
  articleSlug: z.string().nullable(),
  articleStatus: ArticleStatusSchema.nullable(),
  actorName: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

/** News category. */
export const CategorySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

/** Uploaded media asset (featured images). */
export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  storageKey: z.string(),
  url: z.string(),
  mimeType: z.string().nullable(),
  byteSize: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  altText: z.string().nullable(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
