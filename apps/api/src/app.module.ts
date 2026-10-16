import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { DbService } from "./db/db.service";

@Module({
  controllers: [HealthController],
  providers: [DbService],
})
export class AppModule {}
