import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SetMetadata } from "@nestjs/common";
import { UsersService, SEED_ADMIN_ID } from "../users/users.service";
import type { StaffUser } from "../users/users.service";

export const REQUIRED_ROLES_KEY = "requiredRoles";
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export interface AdminRequest extends Request {
  adminUser?: StaffUser;
}

function getToken(req: Request): string | null {
  const headers = req.headers as unknown as Record<
    string,
    string | string[] | undefined
  >;
  const auth = headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const token = headers["x-admin-token"];
  if (typeof token === "string" && token.length > 0) return token;
  if (Array.isArray(token) && token.length > 0) return token[0];
  return null;
}

function getUserId(req: Request): string {
  const headers = req.headers as unknown as Record<
    string,
    string | string[] | undefined
  >;
  const id = headers["x-admin-user-id"];
  const raw = Array.isArray(id) ? id[0] : id;
  return raw && raw.length > 0 ? raw : SEED_ADMIN_ID;
}

/**
 * MVP staff auth for /api/v1/admin/*.
 * - Requires ADMIN_API_TOKEN (Bearer or x-admin-token). Defaults to
 *   "dev-admin-token" locally with a startup warning; set a real secret in prod.
 * - Resolves the actor from x-admin-user-id (defaults to the seeded admin).
 * - Enforces account status and optional @RequireRoles(...) server-side.
 * Full session/JWT login lands after the core workflow works.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);
  private readonly expectedToken: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {
    const token = process.env.ADMIN_API_TOKEN;
    if (!token) {
      this.logger.warn(
        "ADMIN_API_TOKEN not set — using dev default. Set a secret in production.",
      );
    }
    this.expectedToken = token ?? "dev-admin-token";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const token = getToken(req);
    if (!token || token !== this.expectedToken) {
      throw new UnauthorizedException("Missing or invalid admin credentials.");
    }
    const userId = getUserId(req);
    const user = await this.users.findByIdOrEmail(userId);
    if (!user) throw new UnauthorizedException("Unknown staff user.");
    if (user.status !== "active")
      throw new ForbiddenException("Staff account is not active.");

    (req as unknown as Record<string, unknown>).adminUser = user;

    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length > 0 && !required.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException(
        `Requires one of roles: ${required.join(", ")}.`,
      );
    }
    return true;
  }
}
