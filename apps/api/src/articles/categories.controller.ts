import { Controller, Get } from "@nestjs/common";
import { ArticlesService } from "./articles.service";

/** Public category listing — names/descriptions are public by design. */
@Controller("api/v1/categories")
export class CategoriesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  async list() {
    return this.articles.listCategories();
  }
}
