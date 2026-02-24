import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RbacService } from "../rbac.service";
import {
  PERMISSION_KEY,
  RequirePermissionMeta,
} from "../decorators/require-permission.decorator";

@Injectable()
export class AppPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMeta = this.reflector.getAllAndOverride<RequirePermissionMeta>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionMeta) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || request.user?.userId;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const hasPermission = await this.rbacService.userHasPermission(
      userId,
      permissionMeta.appCode,
      permissionMeta.permission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${permissionMeta.permission} for app ${permissionMeta.appCode}`,
      );
    }

    return true;
  }
}
