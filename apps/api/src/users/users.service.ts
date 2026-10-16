import { Injectable } from "@nestjs/common";
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

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

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
