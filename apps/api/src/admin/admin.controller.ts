import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { DbService } from "../db/db.service";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard";
import { AdminUser } from "../admin-auth/admin-user.decorator";
import type { StaffUser } from "../users/users.service";

/**
 * Staff dashboard reads — every route requires admin auth.
 * All numbers come from live DB rows; nothing is hardcoded.
 */
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@UseGuards(AdminAuthGuard)
@Controller("api/v1/admin")
export class AdminController {
  constructor(private readonly db: DbService) {}

  /** Verify credentials + resolve identity (used by admin sign-in). */
  @Get("me")
  me(@AdminUser() user: StaffUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles,
    };
  }

  /** Dashboard counters by article status. */
  @Get("stats")
  async stats() {
    const { rows } = await this.db.query<{ status: string; count: string }>(
      "SELECT status, COUNT(*) AS count FROM articles GROUP BY status",
    );
    const byStatus = Object.fromEntries(
      rows.map((r) => [r.status, Number(r.count)]),
    );
    const published = byStatus["PUBLISHED"] ?? 0;
    const drafts = byStatus["DRAFT"] ?? 0;
    const inReview = byStatus["IN_REVIEW"] ?? 0;
    const scheduled = byStatus["SCHEDULED"] ?? 0;
    const archived = byStatus["ARCHIVED"] ?? 0;
    return {
      published,
      drafts,
      inReview,
      scheduled,
      archived,
      total: published + drafts + inReview + scheduled + archived,
    };
  }

  /** Recent staff activity from the audit trail (newest first). */
  @Get("activity")
  async activity(@Query("limit") limit?: string) {
    const take = Math.min(Math.max(parseInt(limit ?? "10", 10) || 10, 1), 50);
    const { rows } = await this.db.query<{
      id: string; // BIGSERIAL → node-postgres returns BIGINT as string
      action: string;
      resource_type: string;
      resource_id: string;
      article_title: string | null;
      article_slug: string | null;
      article_status: string | null;
      actor_name: string | null;
      created_at: string;
    }>(
      `SELECT l.id, l.action, l.resource_type, l.resource_id,
              a.title AS article_title, a.slug AS article_slug, a.status AS article_status,
              u.display_name AS actor_name, l.created_at
       FROM audit_logs l
       LEFT JOIN articles a ON a.id::text = l.resource_id AND l.resource_type = 'article'
       LEFT JOIN users u ON u.id = l.actor_id
       ORDER BY l.id DESC LIMIT ${take}`,
    );
    return rows.map((r) => ({
      id: Number(r.id),
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      articleTitle: r.article_title,
      articleSlug: r.article_slug,
      articleStatus: r.article_status,
      actorName: r.actor_name,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /** Categories for the article editor. */
  @Get("categories")
  async categories() {
    const { rows } = await this.db.query<{
      id: number;
      slug: string;
      name: string;
      description: string | null;
    }>("SELECT id, slug, name, description FROM categories ORDER BY name");
    return rows;
  }
}
