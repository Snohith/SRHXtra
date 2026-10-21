import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SetMetadata } from "@nestjs/common";
import { UsersService } from "../users/users.service";
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

/**
 * Staff auth for /api/v1/admin/*.
 * - Requires a per-staff API credential (Bearer or x-admin-token).
 * - Resolves the actor from the token hash; clients cannot choose an identity.
 * - Enforces account status and optional @RequireRoles(...) server-side.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const token = getToken(req);
    if (!token) {
      throw new UnauthorizedException("Missing admin credentials.");
    }
    const user = await this.users.findByApiToken(token);
    if (!user) {
      throw new UnauthorizedException("Invalid admin credentials.");
    }
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
