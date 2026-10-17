import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { ArticlesService } from "./articles.service";

/** Public read API — published articles only. Drafts never leak here. */
@Controller("api/v1/articles")
export class PublicArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("sort") sort?: string,
  ) {
    const p = Math.max(parseInt(page ?? "1", 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize ?? "20", 10) || 20, 1), 100);
    const direction = sort === "oldest" ? "oldest" : "newest";
    const { data, total } = await this.articles.publicList({
      page: p,
      pageSize: ps,
      category,
      search,
      sort: direction,
    });
    return { data, page: p, pageSize: ps, total };
  }

  @Get(":slug")
  async getBySlug(@Param("slug") slug: string) {
    try {
      return await this.articles.publicGetBySlug(slug);
    } catch {
      // Generic 404 so draft existence is not revealed.
      throw new NotFoundException("Article not found.");
    }
  }
}
