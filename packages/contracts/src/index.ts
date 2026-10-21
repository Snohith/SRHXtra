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

export const ArticleStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

export const RoleNameSchema = z.enum([
  "admin",
  "editor",
  "writer",
  "publisher",
]);
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
  scheduledFor: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Article = z.infer<typeof ArticleSchema>;

/** List/article-card shape: everything except the (potentially large) body. */
export const ArticleSummarySchema = ArticleSchema.omit({ body: true });
export type ArticleSummary = z.infer<typeof ArticleSummarySchema>;

const CoverImageUrlSchema = z
  .string()
  .max(2000)
  .regex(/^(?:https?:\/\/\S+|\/(?!\/)\S+)$/i, "invalid cover image URL")
  .optional();

export const CreateArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug must be lowercase alphanumeric with hyphens",
    )
    .optional(),
  excerpt: z.string().max(2000).optional(),
  body: z.string().min(1),
  categoryId: z.number().int().positive().optional(),
  coverImageUrl: CoverImageUrlSchema,
  seoTitle: z.string().min(1).max(200).optional(),
  seoDescription: z.string().min(1).max(300).optional(),
});
export type CreateArticle = z.infer<typeof CreateArticleSchema>;

export const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug must be lowercase alphanumeric with hyphens",
    )
    .optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  coverImageUrl: CoverImageUrlSchema.nullable(),
  seoTitle: z.string().min(1).max(200).nullable().optional(),
  seoDescription: z.string().min(1).max(300).nullable().optional(),
});
export type UpdateArticle = z.infer<typeof UpdateArticleSchema>;

export const PublicArticlesQuerySchema = PaginationQuerySchema.extend({
  category: z.string().min(1).max(100).optional(),
  search: z.string().min(1).max(200).optional(),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
});
export type PublicArticlesQuery = z.infer<typeof PublicArticlesQuerySchema>;

/** Server-side list ordering (whitelisted on the API side). */
export const ArticleSortSchema = z.enum([
  "updated",
  "created",
  "published",
  "title",
]);
export type ArticleSort = z.infer<typeof ArticleSortSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const AdminArticlesQuerySchema = PaginationQuerySchema.extend({
  status: ArticleStatusSchema.optional(),
  search: z.string().min(1).max(200).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  sort: ArticleSortSchema.optional(),
  dir: SortDirectionSchema.optional(),
});
export type AdminArticlesQuery = z.infer<typeof AdminArticlesQuerySchema>;

/** Bulk workflow actions (max 50 ids per call; per-id results reported back). */
export const BulkArticleActionSchema = z.enum([
  "archive",
  "restore",
  "publish",
  "set-category",
]);
export type BulkArticleAction = z.infer<typeof BulkArticleActionSchema>;

export const BulkArticlesRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: BulkArticleActionSchema,
  /** Required for `set-category`. */
  categoryId: z.number().int().positive().nullable().optional(),
});
export type BulkArticlesRequest = z.infer<typeof BulkArticlesRequestSchema>;

export const BulkArticleResultSchema = z.object({
  id: z.string().uuid(),
  ok: z.boolean(),
  error: z.string().nullable(),
});
export type BulkArticleResult = z.infer<typeof BulkArticleResultSchema>;

export const BulkArticlesResponseSchema = z.object({
  action: BulkArticleActionSchema,
  succeeded: z.number().int(),
  failed: z.number().int(),
  results: z.array(BulkArticleResultSchema),
});
export type BulkArticlesResponse = z.infer<typeof BulkArticlesResponseSchema>;

/** Workflow v2 request bodies. */
export const RequestChangesSchema = z.object({
  note: z.string().min(1).max(1000),
});
export type RequestChanges = z.infer<typeof RequestChangesSchema>;

export const ScheduleArticleSchema = z.object({
  /** ISO-8601 instant; must be in the future (server enforces). */
  scheduledFor: z.string().datetime(),
});
export type ScheduleArticle = z.infer<typeof ScheduleArticleSchema>;

/** One entry in an article's revision history (metadata only). */
export const ArticleRevisionSummarySchema = z.object({
  version: z.number().int(),
  title: z.string(),
  status: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ArticleRevisionSummary = z.infer<
  typeof ArticleRevisionSummarySchema
>;

/** Full content snapshot of a single revision. */
export const ArticleRevisionSchema = ArticleRevisionSummarySchema.extend({
  id: z.string().uuid(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  body: z.string(),
  coverImageUrl: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
});
export type ArticleRevision = z.infer<typeof ArticleRevisionSchema>;

export const PaginatedArticlesSchema = z.object({
  data: z.array(ArticleSummarySchema),
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
  scheduled: z.number().int(),
  archived: z.number().int(),
  total: z.number().int(),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

/** One recent admin action for the dashboard activity feed. */
export const ActivityItemSchema = z.object({
  id: z.number().int(),
  action: z.string(),
  /** Raw audit metadata (scheduledFor, note, version…); the feed reads it for detail lines. */
  metadata: z.record(z.unknown()).optional(),
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

/** Paginated media library listing. */
export const PaginatedMediaSchema = z.object({
  data: z.array(MediaAssetSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type PaginatedMedia = z.infer<typeof PaginatedMediaSchema>;

/** Signed direct-upload ticket (Step 5): client PUTs to `uploadUrl`, then completes. */
export const UploadTicketSchema = z.object({
  intentId: z.string().uuid(),
  storageKey: z.string(),
  provider: z.enum(["local", "s3"]),
  uploadUrl: z.string(),
  method: z.literal("PUT"),
  headers: z.record(z.string()),
  publicUrl: z.string(),
  expiresAt: z.string(),
});
export type UploadTicket = z.infer<typeof UploadTicketSchema>;
