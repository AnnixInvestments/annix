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

const COMPANY_ROLE_GRANTS: Record<AnnixOrbitRole, AnnixOrbitRole[]> = {
  [AnnixOrbitRole.ADMIN]: [AnnixOrbitRole.ADMIN, AnnixOrbitRole.RECRUITER, AnnixOrbitRole.VIEWER],
  [AnnixOrbitRole.RECRUITER]: [AnnixOrbitRole.RECRUITER, AnnixOrbitRole.VIEWER],
  [AnnixOrbitRole.VIEWER]: [AnnixOrbitRole.VIEWER],
  [AnnixOrbitRole.INDIVIDUAL]: [AnnixOrbitRole.INDIVIDUAL],
  [AnnixOrbitRole.STUDENT]: [AnnixOrbitRole.STUDENT],
};

@Injectable()
export class AnnixOrbitRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AnnixOrbitRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException("Access denied");
    }

    if (user.role === AnnixOrbitRole.ADMIN) {
      return true;
    }

    const grantedRoles = COMPANY_ROLE_GRANTS[user.role as AnnixOrbitRole] ?? [];
    const hasAccess = requiredRoles.some((role) => grantedRoles.includes(role));

    if (!hasAccess) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
