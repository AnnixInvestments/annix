import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const STOCK_CONTROL_ROLES_KEY = "stockControlRoles";

export const StockControlRoles = (...roles: string[]) => SetMetadata(STOCK_CONTROL_ROLES_KEY, roles);

@Injectable()
export class StockControlRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(STOCK_CONTROL_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(" or ")}`,
      );
    }

    return true;
  }
}
