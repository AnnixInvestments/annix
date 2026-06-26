import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class AuRubberAccessGuard implements CanActivate {
  constructor(private readonly rbacService: RbacService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;

    if (!user?.id) {
      return false;
    }

    const accessDetails = await this.rbacService.userAccessDetails(user.id, "au-rubber");

    const userRoles = user.roles || [];
    if (userRoles.includes("admin") || userRoles.includes("employee")) {
      request.auRubberPermissions = accessDetails.permissions;
      request.auRubberRole = "administrator";
      return true;
    }

    if (!accessDetails.hasAccess) {
      return false;
    }

    request.auRubberPermissions = accessDetails.permissions;
    request.auRubberRole = accessDetails.roleCode;

    return true;
  }
}
