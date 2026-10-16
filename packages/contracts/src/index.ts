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
