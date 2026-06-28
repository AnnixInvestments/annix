import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class AuRubberAccessGuard implements CanActivate {
  private rbacService: RbacService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;

    if (!user?.id) {
      return false;
    }

    const accessDetails = await this.rbac().userAccessDetails(user.id, "au-rubber");

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

  private rbac(): RbacService {
    if (this.rbacService) {
      return this.rbacService;
    }

    const service = this.moduleRef.get(RbacService, { strict: false });
    this.rbacService = service;
    return service;
  }
}
