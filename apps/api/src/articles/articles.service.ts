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

export type ArticleStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED";

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
  createdAt: string;
  updatedAt: string;
}

const ARTICLE_SELECT = `
  SELECT a.id, a.title, a.slug, a.excerpt, a.body, a.status,
         a.author_id, u.display_name AS author_name,
         a.category_id, c.slug AS category_slug, c.name AS category_name,
         a.cover_image_url, a.published_at, a.created_at, a.updated_at
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
        await client.query(
          `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
           VALUES ('article.updated', 'article', $1, $2::jsonb)`,
          [
            id,
            JSON.stringify({
              id,
              slug: article.slug,
              title: article.title,
              updatedAt: new Date().toISOString(),
            }),
          ],
        );
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
        "UPDATE articles SET status = 'IN_REVIEW' WHERE id = $1",
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
      if (rows[0].status !== "IN_REVIEW") {
        throw new BadRequestException(
          `Only IN_REVIEW articles can be published (current: ${rows[0].status}).`,
        );
      }
      await client.query(
        "UPDATE articles SET status = 'PUBLISHED', published_at = now() WHERE id = $1",
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
          metadata: { from: "IN_REVIEW", to: "PUBLISHED" },
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
