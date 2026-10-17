import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { PipelineHealthService } from "./pipeline-health.service";

/**
 * Versioned health endpoint (Step 2 contract: GET /api/v1/health).
 * Step 5 adds publishing-pipeline visibility: outbox backlog + worker heartbeat.
 */
@Controller("api/v1/health")
export class ApiHealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly db: DbService,
    private readonly pipeline: PipelineHealthService,
  ) {}

  @Get()
  async check() {
    const db = await this.db.check();
    const pipeline = await this.pipeline.snapshot();
    return {
      status: "ok" as const,
      db: db.up ? ("up" as const) : ("down" as const),
      pipeline,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }

  @Get("db")
  async checkDb() {
    const db = await this.db.check();
    const body = {
      status: db.up ? ("ok" as const) : ("degraded" as const),
      db: db.up ? ("up" as const) : ("down" as const),
      latencyMs: db.latencyMs,
      timestamp: new Date().toISOString(),
    };
    if (!db.up) throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
