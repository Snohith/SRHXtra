import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { DbService } from "../db/db.service";

@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly db: DbService) {}

  /** Liveness probe — always 200, reports DB state in body. */
  @Get()
  async check() {
    const db = await this.db.check();
    return {
      status: "ok" as const,
      db: db.up ? ("up" as const) : ("down" as const),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }

  /** Readiness probe — 200 when DB is up, 503 when down. */
  @Get("db")
  async checkDb() {
    const db = await this.db.check();
    const body = {
      status: db.up ? ("ok" as const) : ("degraded" as const),
      db: db.up ? ("up" as const) : ("down" as const),
      latencyMs: db.latencyMs,
      timestamp: new Date().toISOString(),
    };
    if (!db.up) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}
