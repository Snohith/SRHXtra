import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, Queryable } from "../db/db.service";
import { AuditService } from "../audit/audit.service";
import type { StaffUser } from "../users/users.service";
import type { CreateArticleDto, UpdateArticleDto } from "./dto";

export type ArticleStatus =
  "DRAFT" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: ArticleStatus;
  author_id: string;
  author_name: string | null;
  category_id: number | null;
  category_slug: string | null;
  category_name: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: ArticleStatus;
  authorId: string;
  authorName: string | null;
  categoryId: number | null;
  categorySlug: string | null;
  categoryName: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Revision metadata for the history panel. */
export interface RevisionSummaryDto {
  version: number;
  title: string;
  status: string;
  createdBy: string | null;
  createdAt: string;
}

/** Full revision snapshot (view + restore). */
export interface RevisionDto extends RevisionSummaryDto {
  id: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
}

const ARTICLE_SELECT = `
  SELECT a.id, a.title, a.slug, a.excerpt, a.body, a.status,
         a.author_id, u.display_name AS author_name,
         a.category_id, c.slug AS category_slug, c.name AS category_name,
         a.cover_image_url, a.published_at, a.scheduled_for, a.review_note,
         a.created_at, a.updated_at
  FROM articles a
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN categories c ON c.id = a.category_id
`;

function toIso(v: string | Date | null): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

export function toArticleDto(row: ArticleRow): ArticleDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    authorId: row.author_id,
    authorName: row.author_name,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    coverImageUrl: row.cover_image_url,
    publishedAt: toIso(row.published_at),
    scheduledFor: toIso(row.scheduled_for),
    reviewNote: row.review_note,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
  };
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 200);
  return base || "article";
}

const PUBLISH_ROLES = ["admin", "editor", "publisher"];

@Injectable()
export class ArticlesService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  private async ensureUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = base;
    let n = 1;
    for (;;) {
      const { rows } = await this.db.query<{ id: string }>(
        excludeId
          ? "SELECT id FROM articles WHERE slug = $1 AND id <> $2"
          : "SELECT id FROM articles WHERE slug = $1",
        excludeId ? [candidate, excludeId] : [candidate],
      );
      if (rows.length === 0) return candidate;
      n += 1;
      const suffix = `-${n}`;
      candidate = `${base.slice(0, 200 - suffix.length)}${suffix}`;
      if (n > 1000)
        throw new ConflictException("Could not generate a unique slug.");
    }
  }

  private async assertCategory(
    categoryId: number | null | undefined,
  ): Promise<void> {
    if (categoryId === undefined || categoryId === null) return;
    const { rows } = await this.db.query(
      "SELECT id FROM categories WHERE id = $1",
      [categoryId],
    );
    if (rows.length === 0)
      throw new BadRequestException(`Unknown categoryId: ${categoryId}.`);
  }

  private async snapshotRevision(
    articleId: string,
    actorId: string,
    client?: Queryable,
  ): Promise<void> {
    const q: Queryable = client ?? this.db;
    const { rows } = await q.query<{ max: number | null }>(
      "SELECT MAX(version) AS max FROM article_revisions WHERE article_id = $1",
      [articleId],
    );
    const next = (rows[0]?.max ?? 0) + 1;
    await q.query(
      `INSERT INTO article_revisions
         (article_id, version, title, slug, excerpt, body, status, cover_image_url, created_by)
       SELECT id, $2, title, slug, excerpt, body, status, cover_image_url, $3 FROM articles WHERE id = $1`,
      [articleId, next, actorId],
    );
  }

  private async getByIdOrThrow(
    id: string,
    client?: Queryable,
  ): Promise<ArticleRow> {
    const q: Queryable = client ?? this.db;
    const { rows } = await q.query<ArticleRow>(
      `${ARTICLE_SELECT} WHERE a.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException("Article not found.");
    return rows[0];
  }

  async adminGetById(id: string): Promise<ArticleDto> {
    return toArticleDto(await this.getByIdOrThrow(id));
  }

  // -- Admin ---------------------------------------------------------------

  async create(input: CreateArticleDto, actor: StaffUser): Promise<ArticleDto> {
    await this.assertCategory(input.categoryId);
    const slug = await this.ensureUniqueSlug(
      input.slug ?? slugify(input.title),
    );
    return this.db.withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO articles (title, slug, excerpt, body, status, author_id, category_id, cover_image_url)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7) RETURNING id`,
        [
          input.title,
          slug,
          input.excerpt ?? null,
          input.body,
          actor.id,
          input.categoryId ?? null,
          input.coverImageUrl ?? null,
        ],
      );
      const article = await this.getByIdOrThrow(rows[0].id, client);
      await this.snapshotRevision(article.id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.create",
          resourceType: "article",
          resourceId: article.id,
          metadata: { status: "DRAFT", slug },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  async update(
    id: string,
    input: UpdateArticleDto,
    actor: StaffUser,
  ): Promise<ArticleDto> {
    const current = await this.getByIdOrThrow(id);
    // Drafts are freely editable; published stories can be corrected in place
    // (the change revalidates the public site). IN_REVIEW stays locked so the
    // reviewer always reviews what was submitted.
    if (current.status !== "DRAFT" && current.status !== "PUBLISHED") {
      throw new BadRequestException(
        "Only DRAFT or PUBLISHED articles can be edited.",
      );
    }
    if (input.categoryId !== undefined)
      await this.assertCategory(input.categoryId);
    const slug =
      input.slug !== undefined
        ? await this.ensureUniqueSlug(input.slug, id)
        : current.slug;

    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (clause: string, value: unknown) => {
      params.push(value);
      sets.push(`${clause} $${params.length}`);
    };
    if (input.title !== undefined) push("title =", input.title);
    push("slug =", slug);
    if (input.excerpt !== undefined) push("excerpt =", input.excerpt);
    if (input.body !== undefined) push("body =", input.body);
    if (input.categoryId !== undefined) push("category_id =", input.categoryId);
    if (input.coverImageUrl !== undefined)
      push("cover_image_url =", input.coverImageUrl);
    params.push(id);
    return this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE articles SET ${sets.join(", ")} WHERE id = $${params.length}`,
        params,
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.update",
          resourceType: "article",
          resourceId: id,
          metadata: { status: article.status },
        },
        client,
      );
      // Editing a published story must refresh the public site: the outbox
      // event commits atomically with the change and the worker revalidates.
      if (article.status === "PUBLISHED") {
        await this.enqueueArticleUpdated(toArticleDto(article), client);
      }
      return toArticleDto(article);
    });
  }

  async submit(id: string, actor: StaffUser): Promise<ArticleDto> {
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client);
      if (current.status !== "DRAFT") {
        throw new BadRequestException(
          `Only DRAFT articles can be submitted (current: ${current.status}).`,
        );
      }
      await client.query(
        "UPDATE articles SET status = 'IN_REVIEW', review_note = NULL WHERE id = $1",
        [id],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.submit",
          resourceType: "article",
          resourceId: id,
          metadata: { from: "DRAFT", to: "IN_REVIEW" },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  /**
   * Publish is the reliability-critical path (Step 5):
   * status flip + revision + audit + outbox event commit in ONE transaction.
   * The worker later consumes the outbox row and triggers web revalidation;
   * if anything downstream is down, the event is retried, never lost.
   */
  async publish(id: string, actor: StaffUser): Promise<ArticleDto> {
    if (!PUBLISH_ROLES.some((r) => actor.roles.includes(r))) {
      throw new ForbiddenException(
        "Publishing requires editor, publisher, or admin role.",
      );
    }
    return this.db.withTransaction(async (client) => {
      // Row lock serializes concurrent double-publish attempts.
      const { rows } = await client.query<{ status: ArticleStatus }>(
        "SELECT status FROM articles WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (rows.length === 0) throw new NotFoundException("Article not found.");
      if (rows[0].status !== "IN_REVIEW" && rows[0].status !== "SCHEDULED") {
        throw new BadRequestException(
          `Only IN_REVIEW or SCHEDULED articles can be published (current: ${rows[0].status}).`,
        );
      }
      const from = rows[0].status;
      await client.query(
        `UPDATE articles
         SET status = 'PUBLISHED', published_at = now(), scheduled_for = NULL
         WHERE id = $1`,
        [id],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.publish",
          resourceType: "article",
          resourceId: id,
          metadata: { from, to: "PUBLISHED" },
        },
        client,
      );
      await client.query(
        `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
         VALUES ('article.published', 'article', $1, $2::jsonb)`,
        [
          id,
          JSON.stringify({
            id,
            slug: article.slug,
            title: article.title,
            publishedAt: article.published_at,
            categorySlug: article.category_slug,
          }),
        ],
      );
      return toArticleDto(article);
    });
  }

  /**
   * Archive (unpublish / discard). Stories that were PUBLISHED leave the
   * public site; the worker revalidates via an `article.archived` event.
   * Drafts and in-review stories can also be archived — no web event needed
   * because they were never public.
   */
  async archive(id: string, actor: StaffUser): Promise<ArticleDto> {
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client);
      if (current.status === "ARCHIVED") {
        throw new BadRequestException("Article is already archived.");
      }
      const wasPublic = current.status === "PUBLISHED";
      await client.query(
        "UPDATE articles SET status = 'ARCHIVED', scheduled_for = NULL WHERE id = $1",
        [id],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.archive",
          resourceType: "article",
          resourceId: id,
          metadata: { from: current.status, to: "ARCHIVED" },
        },
        client,
      );
      if (wasPublic) {
        await client.query(
          `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('article.archived', 'article', $1, $2::jsonb)`,
          [
            id,
            JSON.stringify({
              id,
              slug: article.slug,
              title: article.title,
              archivedAt: new Date().toISOString(),
            }),
          ],
        );
      }
      return toArticleDto(article);
    });
  }

  /** Restore an archived article to DRAFT (it can be resubmitted). */
  async restore(id: string, actor: StaffUser): Promise<ArticleDto> {
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client);
      if (current.status !== "ARCHIVED") {
        throw new BadRequestException(
          `Only ARCHIVED articles can be restored (current: ${current.status}).`,
        );
      }
      // Back to the draft lifecycle: clear the old publish date (it stays in
      // revision history and audit); a republish stamps a fresh one.
      await client.query(
        "UPDATE articles SET status = 'DRAFT', published_at = NULL WHERE id = $1",
        [id],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.restore",
          resourceType: "article",
          resourceId: id,
          metadata: { from: "ARCHIVED", to: "DRAFT" },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  /**
   * Send an in-review story back to the author with a reviewer note.
   * The note is surfaced on the draft and cleared on the next submission.
   */
  async requestChanges(
    id: string,
    note: string,
    actor: StaffUser,
  ): Promise<ArticleDto> {
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client);
      if (current.status !== "IN_REVIEW") {
        throw new BadRequestException(
          `Only IN_REVIEW articles can be sent back (current: ${current.status}).`,
        );
      }
      await client.query(
        "UPDATE articles SET status = 'DRAFT', review_note = $2 WHERE id = $1",
        [id, note],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.request_changes",
          resourceType: "article",
          resourceId: id,
          metadata: { from: "IN_REVIEW", to: "DRAFT", note },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  /** Schedule an in-review story to publish automatically (worker-driven). */
  async schedule(
    id: string,
    scheduledFor: string,
    actor: StaffUser,
  ): Promise<ArticleDto> {
    if (!PUBLISH_ROLES.some((r) => actor.roles.includes(r))) {
      throw new ForbiddenException(
        "Scheduling requires editor, publisher, or admin role.",
      );
    }
    const when = new Date(scheduledFor);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException("scheduledFor must be a valid ISO date.");
    }
    if (when.getTime() < Date.now() + 30_000) {
      throw new BadRequestException(
        "scheduledFor must be at least 30 seconds in the future.",
      );
    }
    return this.db.withTransaction(async (client) => {
      const { rows } = await client.query<{ status: ArticleStatus }>(
        "SELECT status FROM articles WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (rows.length === 0) throw new NotFoundException("Article not found.");
      if (rows[0].status !== "IN_REVIEW") {
        throw new BadRequestException(
          `Only IN_REVIEW articles can be scheduled (current: ${rows[0].status}).`,
        );
      }
      await client.query(
        "UPDATE articles SET status = 'SCHEDULED', scheduled_for = $2 WHERE id = $1",
        [id, when.toISOString()],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.schedule",
          resourceType: "article",
          resourceId: id,
          metadata: {
            from: "IN_REVIEW",
            to: "SCHEDULED",
            scheduledFor: when.toISOString(),
          },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  /** Cancel a pending schedule and return the story to the review queue. */
  async cancelSchedule(id: string, actor: StaffUser): Promise<ArticleDto> {
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client);
      if (current.status !== "SCHEDULED") {
        throw new BadRequestException(
          `Only SCHEDULED articles can have their schedule cancelled (current: ${current.status}).`,
        );
      }
      await client.query(
        "UPDATE articles SET status = 'IN_REVIEW', scheduled_for = NULL WHERE id = $1",
        [id],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.schedule.cancel",
          resourceType: "article",
          resourceId: id,
          metadata: { from: "SCHEDULED", to: "IN_REVIEW" },
        },
        client,
      );
      return toArticleDto(article);
    });
  }

  // -- Revisions (history, view, restore) ------------------------------------

  /** Revision history (newest first) for the article detail screen. */
  async listRevisions(id: string): Promise<RevisionSummaryDto[]> {
    await this.getByIdOrThrow(id);
    const { rows } = await this.db.query<{
      version: number;
      title: string;
      status: string;
      created_by_name: string | null;
      created_at: string;
    }>(
      `SELECT r.version, r.title, r.status, u.display_name AS created_by_name, r.created_at
       FROM article_revisions r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.article_id = $1
       ORDER BY r.version DESC`,
      [id],
    );
    return rows.map((r) => ({
      version: r.version,
      title: r.title,
      status: r.status,
      createdBy: r.created_by_name,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /** Full snapshot of one revision. */
  async getRevision(id: string, version: number): Promise<RevisionDto> {
    await this.getByIdOrThrow(id);
    const { rows } = await this.db.query<{
      id: string;
      version: number;
      title: string;
      slug: string;
      excerpt: string | null;
      body: string;
      status: string;
      cover_image_url: string | null;
      created_by_name: string | null;
      created_at: string;
    }>(
      `SELECT r.id, r.version, r.title, r.slug, r.excerpt, r.body, r.status,
              r.cover_image_url, u.display_name AS created_by_name, r.created_at
       FROM article_revisions r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.article_id = $1 AND r.version = $2`,
      [id, version],
    );
    if (rows.length === 0) throw new NotFoundException("Revision not found.");
    const r = rows[0];
    return {
      id: r.id,
      version: r.version,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      body: r.body,
      status: r.status,
      coverImageUrl: r.cover_image_url,
      createdBy: r.created_by_name,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  /**
   * Restore a previous version's content onto the article. Status is kept;
   * history stays append-only (the restore writes a NEW revision). Published
   * stories revalidate like any other published edit.
   */
  async restoreRevision(
    id: string,
    version: number,
    actor: StaffUser,
  ): Promise<ArticleDto> {
    const current = await this.getByIdOrThrow(id);
    if (current.status !== "DRAFT" && current.status !== "PUBLISHED") {
      throw new BadRequestException(
        "Only DRAFT or PUBLISHED articles can restore a revision.",
      );
    }
    const rev = await this.getRevision(id, version);
    const slug = await this.ensureUniqueSlug(rev.slug, id);
    return this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE articles
         SET title = $2, slug = $3, excerpt = $4, body = $5, cover_image_url = $6
         WHERE id = $1`,
        [id, rev.title, slug, rev.excerpt, rev.body, rev.coverImageUrl],
      );
      const article = await this.getByIdOrThrow(id, client);
      await this.snapshotRevision(id, actor.id, client);
      await this.audit.record(
        {
          actorId: actor.id,
          action: "article.revision.restore",
          resourceType: "article",
          resourceId: id,
          metadata: { version, status: article.status },
        },
        client,
      );
      if (article.status === "PUBLISHED") {
        await this.enqueueArticleUpdated(toArticleDto(article), client);
      }
      return toArticleDto(article);
    });
  }

  /** Enqueue the "published story changed" event (atomic with the change). */
  private async enqueueArticleUpdated(
    article: ArticleDto,
    client: Queryable,
  ): Promise<void> {
    await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ('article.updated', 'article', $1, $2::jsonb)`,
      [
        article.id,
        JSON.stringify({
          id: article.id,
          slug: article.slug,
          title: article.title,
          updatedAt: new Date().toISOString(),
        }),
      ],
    );
  }

  async adminList(query: {
    page: number;
    pageSize: number;
    status?: ArticleStatus;
    search?: string;
  }): Promise<{ data: ArticleDto[]; total: number }> {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      params.push(query.status);
      conds.push(`a.status = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      conds.push(
        `(a.title ILIKE $${params.length} OR a.body ILIKE $${params.length})`,
      );
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
    const count = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM articles a ${where}`,
      params,
    );
    const limit = Math.min(Math.max(query.pageSize, 1), 100);
    const offset = (Math.max(query.page - 1, 0) || 0) * limit;
    const { rows } = await this.db.query<ArticleRow>(
      `${ARTICLE_SELECT} ${where} ORDER BY a.updated_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      data: rows.map(toArticleDto),
      total: Number(count.rows[0]?.count ?? 0),
    };
  }

  // -- Public (published only) -----------------------------------------------

  async publicList(query: {
    page: number;
    pageSize: number;
    category?: string;
    search?: string;
    sort?: "newest" | "oldest";
  }): Promise<{ data: ArticleDto[]; total: number }> {
    const conds = ["a.status = 'PUBLISHED'"];
    const params: unknown[] = [];
    if (query.category) {
      params.push(query.category);
      conds.push(`c.slug = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      conds.push(
        `(a.title ILIKE $${params.length} OR a.body ILIKE $${params.length})`,
      );
    }
    const where = `WHERE ${conds.join(" AND ")}`;
    const count = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM articles a LEFT JOIN categories c ON c.id = a.category_id ${where}`,
      params,
    );
    const limit = Math.min(Math.max(query.pageSize, 1), 100);
    const offset = (Math.max(query.page - 1, 0) || 0) * limit;
    const order = query.sort === "oldest" ? "ASC" : "DESC";
    const { rows } = await this.db.query<ArticleRow>(
      `${ARTICLE_SELECT} ${where} ORDER BY a.published_at ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      data: rows.map(toArticleDto),
      total: Number(count.rows[0]?.count ?? 0),
    };
  }

  async publicGetBySlug(slug: string): Promise<ArticleDto> {
    const { rows } = await this.db.query<ArticleRow>(
      `${ARTICLE_SELECT} WHERE a.slug = $1 AND a.status = 'PUBLISHED'`,
      [slug],
    );
    if (rows.length === 0) throw new NotFoundException("Article not found.");
    return toArticleDto(rows[0]);
  }

  async listCategories(): Promise<
    { id: number; slug: string; name: string; description: string | null }[]
  > {
    const { rows } = await this.db.query<{
      id: number;
      slug: string;
      name: string;
      description: string | null;
    }>("SELECT id, slug, name, description FROM categories ORDER BY name");
    return rows;
  }
}
