import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // #384: read role metadata from BOTH the handler AND the class. The old
    // getHandler()-only read silently ignored class-level @Roles(...) — almost
    // every admin controller declares @Roles at the class level, so those gates
    // never enforced (authentication-only). getAllAndOverride keeps a
    // handler-level @Roles overriding the class default, so per-method behaviour
    // is identical; it only fixes the class-level case.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    // Defensive: deny rather than throw if a request reaches here without a
    // populated roles array (both AdminAuthGuard and JwtStrategy default to []).
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    return requiredRoles.some((role) => roles.includes(role));
  }
}
