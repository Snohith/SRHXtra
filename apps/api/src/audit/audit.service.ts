import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  async record(input: {
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
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
