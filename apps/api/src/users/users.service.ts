import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DbService } from "../db/db.service";

export interface StaffUser {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
}

/** Fallback seed admin (see migrations/001_init.sql). */
export const SEED_ADMIN_ID = "11111111-1111-1111-1111-111111111111";

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  /**
   * Resolve the staff member that owns a credential. The client never names
   * the user; identity comes from the token hash stored on the user row.
   *
   * ADMIN_API_TOKEN is only a bootstrap credential for the seeded admin while
   * that account has no personal token. Issue one with `staff:token`.
   */
  async findByApiToken(token: string): Promise<StaffUser | null> {
    const tokenHash = hashApiToken(token);
    const bootstrap = process.env.ADMIN_API_TOKEN;
    const bootstrapHash = bootstrap ? hashApiToken(bootstrap) : null;
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      display_name: string | null;
      status: string;
    }>(
      `SELECT id, email, display_name, status FROM users
       WHERE api_token_hash = $1
          OR (id = $2 AND api_token_hash IS NULL
              AND $3::text IS NOT NULL AND $3 = $1)
       LIMIT 1`,
      [tokenHash, SEED_ADMIN_ID, bootstrapHash],
    );
    const user = rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      status: user.status,
      roles: await this.rolesFor(user.id),
    };
  }

  async findById(id: string): Promise<StaffUser | null> {
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      display_name: string | null;
      status: string;
    }>("SELECT id, email, display_name, status FROM users WHERE id = $1", [id]);
    const user = rows[0];
    if (!user) return null;
    const roles = await this.rolesFor(user.id);
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      status: user.status,
      roles,
    };
  }

  /** Look up staff by UUID or email (not used for authentication). */
  async findByIdOrEmail(idOrEmail: string): Promise<StaffUser | null> {
    // UUID lookup first; skip it for non-UUID input (Postgres would raise
    // `invalid input syntax for type uuid` instead of returning no rows).
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrEmail,
      )
    ) {
      const byId = await this.findById(idOrEmail);
      if (byId) return byId;
    }
    const { rows } = await this.db.query<{
      id: string;
      email: string;
      display_name: string | null;
      status: string;
    }>(
      "SELECT id, email, display_name, status FROM users WHERE lower(email) = lower($1)",
      [idOrEmail],
    );
    const user = rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      status: user.status,
      roles: await this.rolesFor(user.id),
    };
  }
  async rolesFor(userId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ name: string }>(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 ORDER BY r.name`,
      [userId],
    );
    return rows.map((r) => r.name);
  }
}
