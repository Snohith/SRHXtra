import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { ApiHealthController } from "./health/api-health.controller";
import { DbService } from "./db/db.service";
import { UsersService } from "./users/users.service";
import { AuditService } from "./audit/audit.service";
import { AdminAuthGuard } from "./admin-auth/admin-auth.guard";
import { AdminController } from "./admin/admin.controller";
import { MediaController } from "./media/media.controller";
import { ArticlesService } from "./articles/articles.service";
import { PublicArticlesController } from "./articles/public-articles.controller";
import { AdminArticlesController } from "./articles/admin-articles.controller";

@Module({
  controllers: [
    HealthController,
    ApiHealthController,
    AdminController,
    MediaController,
    PublicArticlesController,
    AdminArticlesController,
  ],
  providers: [DbService, UsersService, AuditService, AdminAuthGuard, ArticlesService],
})
export class AppModule {}
