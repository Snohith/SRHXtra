import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { StaffUser } from "../users/users.service";

/** Injects the authenticated staff user (set by AdminAuthGuard). */
export const AdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StaffUser => {
    const req = ctx.switchToHttp().getRequest() as { adminUser: StaffUser };
    return req.adminUser;
  },
);
