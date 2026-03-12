import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ActionPermissionService } from "../services/action-permission.service";

export const STOCK_CONTROL_ROLES_KEY = "stockControlRoles";
export const PERMISSION_KEY = "actionPermissionKey";

export const StockControlRoles = (...roles: string[]) =>
  SetMetadata(STOCK_CONTROL_ROLES_KEY, roles);

export const PermissionKey = (key: string) => SetMetadata(PERMISSION_KEY, key);

@Injectable()
export class StockControlRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(ActionPermissionService)
    private readonly actionPermissionService: ActionPermissionService | null,
  ) {}

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

    const permissionKey = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (permissionKey && this.actionPermissionService && user.companyId) {
      const overrideRoles = await this.actionPermissionService.rolesForAction(
        user.companyId,
        permissionKey,
      );

      if (overrideRoles && overrideRoles.length > 0) {
        if (!overrideRoles.includes(user.role)) {
          throw new ForbiddenException(
            `Insufficient permissions. Required: ${overrideRoles.join(" or ")}`,
          );
        }
        return true;
      }
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(" or ")}`,
      );
    }

    return true;
  }
}
