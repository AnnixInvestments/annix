import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { now } from "../../lib/datetime";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import { StockControlProfileRepository } from "../../stock-control/repositories/stock-control-profile.repository";
import { UserRepository } from "../../user/user.repository";

export interface SageExportSession {
  companyId: number | null;
  appKey: string;
  userId: number | null;
  allowedModules: string[];
}

export interface SageExportRequest {
  sageExport: SageExportSession;
}

const SUPPORTED_MODULES = ["stock-control", "au-rubber"] as const;

@Injectable()
export class SageExportAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly profileRepo: StockControlProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly appRepo: AppRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = this.verifiedPayload(request.headers.authorization);
    const userId = payload.sub ? Number(payload.sub) : null;

    if (!userId || Number.isNaN(userId)) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const requestedModule: string | null = request.params?.moduleCode ?? null;
    const session = await this.resolveSession(payload, userId, requestedModule);

    request.sageExport = session;
    request.user = request.user ?? {
      id: userId,
      userId,
      companyId: session.companyId,
    };

    return true;
  }

  private verifiedPayload(authHeader: string | undefined): {
    sub: string | number;
    type?: string;
    roles?: string[];
  } {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.tokenType === "refresh") {
        throw new UnauthorizedException("Refresh tokens are not accepted on this route");
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private async resolveSession(
    payload: { type?: string; roles?: string[] },
    userId: number,
    requestedModule: string | null,
  ): Promise<SageExportSession> {
    const allowedModules = await this.allowedModules(payload, userId);

    if (requestedModule === null) {
      return { companyId: null, appKey: "sage-export", userId, allowedModules };
    }

    if (!allowedModules.includes(requestedModule)) {
      throw new ForbiddenException(
        `Your account is not entitled to Sage export for ${requestedModule}`,
      );
    }

    const companyId = await this.companyForModule(payload, userId, requestedModule);
    return { companyId, appKey: requestedModule, userId, allowedModules };
  }

  private async allowedModules(
    payload: { type?: string; roles?: string[] },
    userId: number,
  ): Promise<string[]> {
    const stockControlAllowed = payload.type === "stock-control";
    const auRubberAllowed = await this.hasAuRubberAccess(payload, userId);

    return SUPPORTED_MODULES.filter((moduleCode) =>
      moduleCode === "stock-control" ? stockControlAllowed : auRubberAllowed,
    );
  }

  private async companyForModule(
    payload: { type?: string },
    userId: number,
    moduleCode: string,
  ): Promise<number | null> {
    if (moduleCode === "stock-control") {
      if (payload.type !== "stock-control") {
        throw new UnauthorizedException("Invalid token type for stock-control");
      }
      const profile = await this.profileRepo.findOneByUserId(userId);
      if (!profile) {
        throw new UnauthorizedException("Stock Control profile not found");
      }
      return profile.companyId;
    }

    const user = await this.userRepo.findByIdWithRoles(userId);
    return user?.companyId ?? null;
  }

  private async hasAuRubberAccess(payload: { roles?: string[] }, userId: number): Promise<boolean> {
    const roles = payload.roles ?? [];
    if (roles.includes("admin") || roles.includes("employee")) {
      return true;
    }

    const app = await this.appRepo.findOneWhere({ code: "au-rubber", isActive: true });
    if (!app) {
      return false;
    }

    const access = await this.userAppAccessRepo.findOneByUserAndAppWithRole(userId, app.id);
    if (!access) {
      return false;
    }

    if (access.expiresAt && access.expiresAt < now().toJSDate()) {
      return false;
    }

    return true;
  }
}
