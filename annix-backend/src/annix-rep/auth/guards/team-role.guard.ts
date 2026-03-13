import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TeamRole } from "../../entities/team-member.entity";
import { TeamService } from "../../services/team.service";

export const TEAM_ROLES_KEY = "teamRoles";

export const TeamRoles = (...roles: TeamRole[]) => SetMetadata(TEAM_ROLES_KEY, roles);

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[]>(TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const annixRepUser = request.annixRepUser;

    if (!annixRepUser?.userId) {
      throw new ForbiddenException("Authentication required");
    }

    const organizationId = annixRepUser.organizationId;
    if (!organizationId) {
      throw new ForbiddenException("User is not part of an organization");
    }

    const member = await this.teamService.memberByUser(organizationId, annixRepUser.userId);
    if (!member) {
      throw new ForbiddenException("User is not a member of this organization");
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(" or ")}`,
      );
    }

    return true;
  }
}
