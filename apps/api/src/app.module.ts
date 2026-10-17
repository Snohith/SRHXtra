import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health/health.controller";
import { ApiHealthController } from "./health/api-health.controller";
import { PipelineHealthService } from "./health/pipeline-health.service";
import { DbService } from "./db/db.service";
import { UsersService } from "./users/users.service";
import { AuditService } from "./audit/audit.service";
import { AdminAuthGuard } from "./admin-auth/admin-auth.guard";
import { AdminController } from "./admin/admin.controller";
import { MediaController } from "./media/media.controller";
import { SignedUploadController } from "./media/signed-upload.controller";
import { MediaService } from "./media/media.service";
import { StorageService } from "./media/storage.service";
import { ArticlesService } from "./articles/articles.service";
import { PublicArticlesController } from "./articles/public-articles.controller";
import { CategoriesController } from "./articles/categories.controller";
import { AdminArticlesController } from "./articles/admin-articles.controller";

@Module({
  imports: [
    // Baseline: generous for the public read API; admin controllers
    // override with the strict bucket below via @Throttle().
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 200 }],
    }),
  ],
  controllers: [
    HealthController,
    ApiHealthController,
    AdminController,
    MediaController,
    SignedUploadController,
    PublicArticlesController,
    CategoriesController,
    AdminArticlesController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    DbService,
    UsersService,
    AuditService,
    AdminAuthGuard,
    ArticlesService,
    PipelineHealthService,
    MediaService,
    StorageService,
  ],
})
export class AppModule {}
