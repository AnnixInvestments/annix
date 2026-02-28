import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { App } from "../../rbac/entities/app.entity";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class AuRubberAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(UserAppAccess)
    private readonly userAppAccessRepo: Repository<UserAppAccess>,
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

    const app = await this.appRepo.findOne({
      where: { code: "au-rubber", isActive: true },
    });

    if (!app) {
      return false;
    }

    const userAccess = await this.userAppAccessRepo.findOne({
      where: { userId: user.id, appId: app.id },
      relations: ["role"],
    });

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
