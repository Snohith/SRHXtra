import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, Queryable } from "../db/db.service";
import { AuditService } from "../audit/audit.service";
import type { StaffUser } from "../users/users.service";
import type { BulkAction, CreateArticleDto, UpdateArticleDto } from "./dto";

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
  seo_title: string | null;
  seo_description: string | null;
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
  seoTitle: string | null;
  seoDescription: string | null;
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
  seoTitle: string | null;
  seoDescription: string | null;
}

const ARTICLE_SELECT = `
  SELECT a.id, a.title, a.slug, a.excerpt, a.body, a.status,
         a.author_id, u.display_name AS author_name,
         a.category_id, c.slug AS category_slug, c.name AS category_name,
         a.cover_image_url, a.published_at, a.scheduled_for, a.review_note,
         a.seo_title, a.seo_description,
         a.created_at, a.updated_at
  FROM articles a
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN categories c ON c.id = a.category_id
`;

/**
 * List variant: cards and sitemaps never render the body, so it is not read
 * or sent for list endpoints (the detail endpoint keeps the full row).
 */
const ARTICLE_SUMMARY_SELECT = `
  SELECT a.id, a.title, a.slug, a.excerpt, a.status,
         a.author_id, u.display_name AS author_name,
         a.category_id, c.slug AS category_slug, c.name AS category_name,
         a.cover_image_url, a.published_at, a.scheduled_for, a.review_note,
         a.seo_title, a.seo_description,
         a.created_at, a.updated_at
  FROM articles a
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN categories c ON c.id = a.category_id
`;

type ArticleSummaryRow = Omit<ArticleRow, "body">;

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
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
  };
}

export type ArticleSummaryDto = Omit<ArticleDto, "body">;

export function toArticleSummaryDto(row: ArticleSummaryRow): ArticleSummaryDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
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
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
  };
}

/** Human-readable message from a Nest HTTP exception (or any error). */
function errorMessage(err: unknown): string {
  if (err instanceof HttpException) {
    const res = err.getResponse();
    if (typeof res === "string") return res;
    if (res && typeof res === "object" && "message" in res) {
      const m = (res as { message: string | string[] }).message;
      return Array.isArray(m) ? m.join("; ") : String(m);
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Unexpected error.";
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
    // Lock the article row so two concurrent writers cannot pick the same version.
    await q.query("SELECT id FROM articles WHERE id = $1 FOR UPDATE", [
      articleId,
    ]);
    const { rows } = await q.query<{ max: number | null }>(
      "SELECT MAX(version) AS max FROM article_revisions WHERE article_id = $1",
      [articleId],
    );
    const next = (rows[0]?.max ?? 0) + 1;
    await q.query(
      `INSERT INTO article_revisions
         (article_id, version, title, slug, excerpt, body, status, cover_image_url,
          seo_title, seo_description, created_by)
       SELECT id, $2, title, slug, excerpt, body, status, cover_image_url,
              seo_title, seo_description, $3
       FROM articles WHERE id = $1`,
      [articleId, next, actorId],
    );
  }

  private async getByIdOrThrow(
    id: string,
    client?: Queryable,
    forUpdate = false,
  ): Promise<ArticleRow> {
    const q: Queryable = client ?? this.db;
    const { rows } = await q.query<ArticleRow>(
      `${ARTICLE_SELECT} WHERE a.id = $1${forUpdate ? " FOR UPDATE OF a" : ""}`,
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
        `INSERT INTO articles (title, slug, excerpt, body, status, author_id, category_id, cover_image_url, seo_title, seo_description)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, $9) RETURNING id`,
        [
          input.title,
          slug,
          input.excerpt ?? null,
          input.body,
          actor.id,
          input.categoryId ?? null,
          input.coverImageUrl ?? null,
          input.seoTitle ?? null,
          input.seoDescription ?? null,
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
    opts: { quiet?: boolean } = {},
  ): Promise<ArticleDto> {
    if (input.categoryId !== undefined)
      await this.assertCategory(input.categoryId);
    const slug =
      input.slug !== undefined
        ? await this.ensureUniqueSlug(input.slug, id)
        : undefined;

    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (clause: string, value: unknown) => {
      params.push(value);
      sets.push(`${clause} $${params.length}`);
    };
    if (input.title !== undefined) push("title =", input.title);
    if (slug !== undefined) push("slug =", slug);
    if (input.excerpt !== undefined) push("excerpt =", input.excerpt);
    if (input.body !== undefined) push("body =", input.body);
    if (input.categoryId !== undefined) push("category_id =", input.categoryId);
    if (input.coverImageUrl !== undefined)
      push("cover_image_url =", input.coverImageUrl);
    if (input.seoTitle !== undefined) push("seo_title =", input.seoTitle);
    if (input.seoDescription !== undefined)
      push("seo_description =", input.seoDescription);
    params.push(id);
    return this.db.withTransaction(async (client) => {
      // Row lock: the status can no longer change between this check and the
      // write, so a story submitted for review cannot be edited under it.
      const current = await this.getByIdOrThrow(id, client, true);
      // Drafts are freely editable; published stories can be corrected in
      // place by workflow roles (the change revalidates the public site).
      // IN_REVIEW stays locked so the reviewer always reviews what was
      // submitted.
      if (current.status !== "DRAFT" && current.status !== "PUBLISHED") {
        throw new BadRequestException(
          "Only DRAFT or PUBLISHED articles can be edited.",
        );
      }
      if (
        current.status === "PUBLISHED" &&
        !PUBLISH_ROLES.some((r) => actor.roles.includes(r))
      ) {
        throw new ForbiddenException(
          "Editing a published article requires editor, publisher, or admin role.",
        );
      }
      // Quiet saves are the autosave path for drafts. A live (published)
      // change always records a revision + audit row and refreshes the site.
      const quiet = opts.quiet === true && current.status !== "PUBLISHED";
      if (sets.length > 0) {
        await client.query(
          `UPDATE articles SET ${sets.join(", ")} WHERE id = $${params.length}`,
          params,
        );
      }
      if (current.status === "PUBLISHED" && slug && slug !== current.slug) {
        await this.rememberSlug(current.slug, id, client);
      }
      const article = await this.getByIdOrThrow(id, client);
      // Quiet saves are the autosave path: the content lands in the row
      // (so nothing is ever lost), but no revision/audit/outbox is written.
      // The explicit Save click still records the canonical revision and,
      // for published stories, revalidates the public site.
      if (quiet) return toArticleDto(article);
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
      const current = await this.getByIdOrThrow(id, client, true);
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
      // Row lock: wasPublic must reflect the status at the moment of the
      // write, not a stale read that a concurrent publish could invalidate.
      const current = await this.getByIdOrThrow(id, client, true);
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
      const current = await this.getByIdOrThrow(id, client, true);
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
      const current = await this.getByIdOrThrow(id, client, true);
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
      const current = await this.getByIdOrThrow(id, client, true);
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
      seo_title: string | null;
      seo_description: string | null;
      created_by_name: string | null;
      created_at: string;
    }>(
      `SELECT r.id, r.version, r.title, r.slug, r.excerpt, r.body, r.status,
              r.cover_image_url, r.seo_title, r.seo_description,
              u.display_name AS created_by_name, r.created_at
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
      seoTitle: r.seo_title,
      seoDescription: r.seo_description,
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
    const rev = await this.getRevision(id, version);
    const slug = await this.ensureUniqueSlug(rev.slug, id);
    return this.db.withTransaction(async (client) => {
      const current = await this.getByIdOrThrow(id, client, true);
      if (current.status !== "DRAFT" && current.status !== "PUBLISHED") {
        throw new BadRequestException(
          "Only DRAFT or PUBLISHED articles can restore a revision.",
        );
      }
      await client.query(
        `UPDATE articles
         SET title = $2, slug = $3, excerpt = $4, body = $5, cover_image_url = $6,
             seo_title = $7, seo_description = $8
         WHERE id = $1`,
        [
          id,
          rev.title,
          slug,
          rev.excerpt,
          rev.body,
          rev.coverImageUrl,
          rev.seoTitle,
          rev.seoDescription,
        ],
      );
      if (current.status === "PUBLISHED" && slug !== current.slug) {
        await this.rememberSlug(current.slug, id, client);
      }
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

  /**
   * Keep old published URLs alive as permanent redirects (migration 007).
   * shortcut: a new article may later claim an old slug; upgrade to a reserved
   * slug check if that ever happens in practice.
   */
  private async rememberSlug(
    oldSlug: string,
    id: string,
    client: Queryable,
  ): Promise<void> {
    await client.query(
      `INSERT INTO article_slug_redirects (old_slug, article_id)
       VALUES ($1, $2) ON CONFLICT (old_slug) DO NOTHING`,
      [oldSlug, id],
    );
  }

  async adminList(query: {
    page: number;
    pageSize: number;
    status?: ArticleStatus;
    search?: string;
    categoryId?: number;
    sort?: "updated" | "created" | "published" | "title";
    dir?: "asc" | "desc";
  }): Promise<{ data: ArticleSummaryDto[]; total: number }> {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      params.push(query.status);
      conds.push(`a.status = $${params.length}`);
    }
    if (query.categoryId) {
      params.push(query.categoryId);
      conds.push(`a.category_id = $${params.length}`);
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
    // Whitelisted sort columns — never interpolate user input into SQL.
    const SORTS: Record<string, string> = {
      updated: "a.updated_at",
      created: "a.created_at",
      published: "a.published_at",
      title: "a.title",
    };
    const col = SORTS[query.sort ?? "updated"] ?? "a.updated_at";
    const direction = query.dir === "asc" ? "ASC" : "DESC";
    // NULLS LAST keeps never-published drafts out of the way in both orders.
    const nulls = col === "a.published_at" ? " NULLS LAST" : "";
    const limit = Math.min(Math.max(query.pageSize, 1), 100);
    const offset = (Math.max(query.page - 1, 0) || 0) * limit;
    const { rows } = await this.db.query<ArticleSummaryRow>(
      `${ARTICLE_SUMMARY_SELECT} ${where}
       ORDER BY ${col} ${direction}${nulls}, a.id ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      data: rows.map(toArticleSummaryDto),
      total: Number(count.rows[0]?.count ?? 0),
    };
  }

  /**
   * Bulk workflow action: run a transition across many stories, reporting
   * per-id results (one ineligible story never blocks the rest). Every item
   * still goes through the same transactional single-item path with its own
   * revision, audit row, and outbox event.
   */
  async bulkAction(
    input: { ids: string[]; action: BulkAction; categoryId?: number | null },
    actor: StaffUser,
  ): Promise<{
    action: BulkAction;
    succeeded: number;
    failed: number;
    results: { id: string; ok: boolean; error: string | null }[];
  }> {
    const ids = [...new Set(input.ids)];
    if (input.action === "set-category") {
      if (input.categoryId == null) {
        throw new BadRequestException(
          "categoryId is required for set-category.",
        );
      }
      await this.assertCategory(input.categoryId);
    }
    const results: { id: string; ok: boolean; error: string | null }[] = [];
    for (const id of ids) {
      try {
        switch (input.action) {
          case "archive":
            await this.archive(id, actor);
            break;
          case "restore":
            await this.restore(id, actor);
            break;
          case "publish":
            await this.publish(id, actor);
            break;
          case "set-category":
            await this.update(
              id,
              { categoryId: input.categoryId ?? null },
              actor,
            );
            break;
        }
        results.push({ id, ok: true, error: null });
      } catch (err) {
        results.push({ id, ok: false, error: errorMessage(err) });
      }
    }
    const succeeded = results.filter((r) => r.ok).length;
    return {
      action: input.action,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  // -- Public (published only) -----------------------------------------------

  async publicList(query: {
    page: number;
    pageSize: number;
    category?: string;
    search?: string;
    sort?: "newest" | "oldest";
  }): Promise<{ data: ArticleSummaryDto[]; total: number }> {
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
    const { rows } = await this.db.query<ArticleSummaryRow>(
      `${ARTICLE_SUMMARY_SELECT} ${where} ORDER BY a.published_at ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      data: rows.map(toArticleSummaryDto),
      total: Number(count.rows[0]?.count ?? 0),
    };
  }

  /**
   * Published article by slug. Old slugs recorded in
   * `article_slug_redirects` resolve to the current article so the web app
   * can redirect instead of 404ing a link that once worked.
   */
  async publicGetBySlug(slug: string): Promise<ArticleDto> {
    const { rows } = await this.db.query<ArticleRow>(
      `${ARTICLE_SELECT} WHERE a.slug = $1 AND a.status = 'PUBLISHED'`,
      [slug],
    );
    if (rows.length > 0) return toArticleDto(rows[0]);

    const viaOldSlug = await this.db.query<ArticleRow>(
      `${ARTICLE_SELECT}
       JOIN article_slug_redirects r ON r.article_id = a.id
       WHERE r.old_slug = $1 AND a.status = 'PUBLISHED'`,
      [slug],
    );
    if (viaOldSlug.rows.length === 0)
      throw new NotFoundException("Article not found.");
    return toArticleDto(viaOldSlug.rows[0]);
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
