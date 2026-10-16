import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

/**
 * Minimal Postgres client.
 * Keeps foundation simple (no ORM yet) while proving API -> DB connectivity.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool | null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      this.logger.warn("DATABASE_URL not set — DB checks will report down.");
      this.pool = null;
      return;
    }
    this.pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 3000,
    });
    this.pool.on("error", (err) => this.logger.error(`PG pool error: ${err.message}`));
  }

  async check(): Promise<{ up: boolean; latencyMs?: number }> {
    if (!this.pool) return { up: false };
    const start = Date.now();
    try {
      await this.pool.query("SELECT 1");
      return { up: true, latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.warn(`DB check failed: ${(err as Error).message}`);
      return { up: false, latencyMs: Date.now() - start };
    }
  }

  /** Typed query helper for repositories/services. Throws if DB is not configured. */
  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.pool) throw new Error("DATABASE_URL not set — database unavailable.");
    const res = await this.pool.query(text, params);
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  }

  async onModuleDestroy() {
    await this.pool?.end().catch(() => undefined);
  }
}
