import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";

export interface PipelineHealth {
  outbox: { pending: number; processing: number; failed: number; done: number } | null;
  worker: { lastHeartbeatAt: string | null; heartbeatAgeSeconds: number | null; stale: boolean } | null;
}

/**
 * Publishing-pipeline health (Step 5): outbox backlog and worker liveness.
 * Degrades to nulls on a pre-003 schema instead of failing /health.
 */
@Injectable()
export class PipelineHealthService {
  constructor(private readonly db: DbService) {}

  async snapshot(): Promise<PipelineHealth> {
    try {
      const { rows } = await this.db.query<{ status: string; count: string }>(
        "SELECT status, COUNT(*)::text AS count FROM outbox_events GROUP BY status",
      );
      const counts: Record<string, number> = { PENDING: 0, PROCESSING: 0, DONE: 0, FAILED: 0 };
      for (const row of rows) counts[row.status] = Number(row.count);

      const { rows: hb } = await this.db.query<{ updated_at: string }>(
        "SELECT updated_at FROM system_state WHERE key = 'worker.heartbeat'",
      );
      const lastHeartbeatAt = hb[0]?.updated_at ?? null;
      const ageSeconds = lastHeartbeatAt
        ? Math.round((Date.now() - new Date(lastHeartbeatAt).getTime()) / 1000)
        : null;
      return {
        outbox: {
          pending: counts.PENDING,
          processing: counts.PROCESSING,
          failed: counts.FAILED,
          done: counts.DONE,
        },
        worker: {
          lastHeartbeatAt,
          heartbeatAgeSeconds: ageSeconds,
          stale: ageSeconds === null || ageSeconds > 30,
        },
      };
    } catch {
      return { outbox: null, worker: null };
    }
  }
}
