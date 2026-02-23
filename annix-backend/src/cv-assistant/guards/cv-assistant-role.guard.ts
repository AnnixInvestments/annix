import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CvAssistantRole } from "../entities/cv-assistant-user.entity";

export const ROLES_KEY = "cv_assistant_roles";

@Injectable()
export class CvAssistantRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<CvAssistantRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException("Access denied");
    }

    const roleHierarchy: Record<CvAssistantRole, number> = {
      [CvAssistantRole.VIEWER]: 1,
      [CvAssistantRole.RECRUITER]: 2,
      [CvAssistantRole.ADMIN]: 3,
    };

    const userRoleLevel = roleHierarchy[user.role as CvAssistantRole] || 0;
    const requiredRoleLevel = Math.min(...requiredRoles.map((role) => roleHierarchy[role] || 0));

    if (userRoleLevel < requiredRoleLevel) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
