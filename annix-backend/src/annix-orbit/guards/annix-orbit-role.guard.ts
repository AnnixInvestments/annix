import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";

export const ROLES_KEY = "cv_assistant_roles";

export const AnnixOrbitRoles = (...roles: AnnixOrbitRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AnnixOrbitRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AnnixOrbitRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException("Access denied");
    }

    const roleHierarchy: Record<AnnixOrbitRole, number> = {
      [AnnixOrbitRole.STUDENT]: 0,
      [AnnixOrbitRole.INDIVIDUAL]: 0,
      [AnnixOrbitRole.VIEWER]: 1,
      [AnnixOrbitRole.RECRUITER]: 2,
      [AnnixOrbitRole.ADMIN]: 3,
    };

    const userRoleLevel = roleHierarchy[user.role as AnnixOrbitRole] || 0;
    const requiredRoleLevel = Math.min(...requiredRoles.map((role) => roleHierarchy[role] || 0));

    if (userRoleLevel < requiredRoleLevel) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
