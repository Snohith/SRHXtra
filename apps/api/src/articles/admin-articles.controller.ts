import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ArticlesService, ArticleStatus } from "./articles.service";
import {
  CreateArticleDto,
  RequestChangesDto,
  ScheduleArticleDto,
  UpdateArticleDto,
} from "./dto";
import { Throttle } from "@nestjs/throttler";
import { AdminAuthGuard, RequireRoles } from "../admin-auth/admin-auth.guard";
import { AdminUser } from "../admin-auth/admin-user.decorator";
import type { StaffUser } from "../users/users.service";

const STATUSES: ArticleStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

/** Roles that may run workflow transitions (submit stays writer-level). */
const WORKFLOW_ROLES = ["admin", "editor", "publisher"] as const;

/** Staff API — every route requires admin auth (see AdminAuthGuard). */
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@UseGuards(AdminAuthGuard)
@Controller("api/v1/admin/articles")
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    if (status !== undefined && !(STATUSES as string[]).includes(status)) {
      throw new BadRequestException(`Invalid status filter: ${status}.`);
    }
    const p = Math.max(parseInt(page ?? "1", 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize ?? "20", 10) || 20, 1), 100);
    const { data, total } = await this.articles.adminList({
      page: p,
      pageSize: ps,
      status: status as ArticleStatus | undefined,
      search,
    });
    return { data, page: p, pageSize: ps, total };
  }

  @Post()
  async create(@Body() dto: CreateArticleDto, @AdminUser() actor: StaffUser) {
    return this.articles.create(dto, actor);
  }

  @Get(":id")
  async getById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.articles.adminGetById(id);
  }

  @Patch(":id")
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArticleDto,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.update(id, dto, actor);
  }

  @Post(":id/submit")
  async submit(
    @Param("id", new ParseUUIDPipe()) id: string,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.submit(id, actor);
  }

  @Post(":id/publish")
  @RequireRoles("admin", "editor", "publisher")
  async publish(
    @Param("id", new ParseUUIDPipe()) id: string,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.publish(id, actor);
  }

  // -- Workflow v2: archive / restore / request-changes / scheduling ---------

  @Post(":id/archive")
  @RequireRoles(...WORKFLOW_ROLES)
  async archive(
    @Param("id", new ParseUUIDPipe()) id: string,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.archive(id, actor);
  }

  @Post(":id/restore")
  @RequireRoles(...WORKFLOW_ROLES)
  async restore(
    @Param("id", new ParseUUIDPipe()) id: string,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.restore(id, actor);
  }

  @Post(":id/request-changes")
  @RequireRoles(...WORKFLOW_ROLES)
  async requestChanges(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: RequestChangesDto,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.requestChanges(id, dto.note, actor);
  }

  @Post(":id/schedule")
  @RequireRoles(...WORKFLOW_ROLES)
  async schedule(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ScheduleArticleDto,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.schedule(id, dto.scheduledFor, actor);
  }

  @Post(":id/schedule/cancel")
  @RequireRoles(...WORKFLOW_ROLES)
  async cancelSchedule(
    @Param("id", new ParseUUIDPipe()) id: string,
    @AdminUser() actor: StaffUser,
  ) {
    return this.articles.cancelSchedule(id, actor);
  }

  // -- Revision history ------------------------------------------------------

  @Get(":id/revisions")
  async revisions(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.articles.listRevisions(id);
  }

  @Get(":id/revisions/:version")
  async revision(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("version", new ParseIntPipe()) version: number,
  ) {
    if (version < 1) throw new BadRequestException("Invalid version.");
    return this.articles.getRevision(id, version);
  }

  @Post(":id/revisions/:version/restore")
  async restoreRevision(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("version", new ParseIntPipe()) version: number,
    @AdminUser() actor: StaffUser,
  ) {
    if (version < 1) throw new BadRequestException("Invalid version.");
    return this.articles.restoreRevision(id, version, actor);
  }
}
