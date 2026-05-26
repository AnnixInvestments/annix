import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class AuRubberAccessGuard implements CanActivate {
  constructor(
    private readonly appRepo: AppRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;

    if (!user?.id) {
      return false;
    }

    const userRoles = user.roles || [];
    if (userRoles.includes("admin") || userRoles.includes("employee")) {
      const permissions = await this.rbacService.userPermissions(user.id, "au-rubber");
      request.auRubberPermissions = permissions;
      request.auRubberRole = "administrator";
      return true;
    }

    const app = await this.appRepo.findOneWhere({ code: "au-rubber", isActive: true });

    if (!app) {
      return false;
    }

    const userAccess = await this.userAppAccessRepo.findOneByUserAndAppWithRole(user.id, app.id);

    if (!userAccess) {
      return false;
    }

    if (userAccess.expiresAt && userAccess.expiresAt < now().toJSDate()) {
      return false;
    }

    const permissions = await this.rbacService.userPermissions(user.id, "au-rubber");
    request.auRubberPermissions = permissions;
    request.auRubberRole = userAccess.role?.code ?? null;

    return true;
  }
}
