import { Injectable } from "@nestjs/common";
import { DbService, Queryable } from "../db/db.service";

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  /**
   * Append an audit row. Pass `client` to join an open transaction so the
   * audit entry commits atomically with the action it describes.
   */
  async record(
    input: {
      actorId: string | null;
      action: string;
      resourceType: string;
      resourceId: string;
      metadata?: Record<string, unknown>;
    },
    client?: Queryable,
  ): Promise<void> {
    const q: Queryable = client ?? this.db;
    await q.query(
      `INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        input.actorId,
        input.action,
        input.resourceType,
        input.resourceId,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
