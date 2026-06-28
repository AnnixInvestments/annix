import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { isString } from "es-toolkit/compat";
import { Request } from "express";
import { StockControlRole } from "../stock-control/entities/stock-control-user.entity";
import { StockControlProfileRepository } from "../stock-control/repositories/stock-control-profile.repository";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";

interface PlatformCompanyJwtPayload {
  sub: number;
  email?: string;
  name?: string;
  type?: string;
  tokenType?: string;
}

interface PlatformCompanyRequestUser {
  id: number;
  email?: string;
  name?: string;
  role: string;
  companyId: number;
  scUserId: number | null;
  unifiedUserId: number;
  unifiedCompanyId: number;
}

type PlatformCompanyAuthenticatedRequest = Request & {
  user?: PlatformCompanyRequestUser;
};

@Injectable()
export class PlatformCompanyAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly profileRepo: StockControlProfileRepository,
    private readonly userRepo: StockControlUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformCompanyAuthenticatedRequest>();
    const token = this.bearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    try {
      const payload = this.jwtService.verify<PlatformCompanyJwtPayload>(token);

      if (payload.type !== "stock-control") {
        throw new UnauthorizedException("Invalid token type");
      }

      if (payload.tokenType === "refresh") {
        throw new UnauthorizedException("Refresh tokens are not accepted on this route");
      }

      const profile = await this.profileRepo.findOneByUserId(payload.sub);

      if (!profile) {
        throw new UnauthorizedException("Stock Control profile not found");
      }

      const scUser = profile.legacyScUserId
        ? await this.userRepo.findOneForCompany(profile.legacyScUserId, profile.companyId)
        : null;

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: scUser?.role || StockControlRole.STOREMAN,
        companyId: profile.companyId,
        scUserId: profile.legacyScUserId ?? null,
        unifiedUserId: payload.sub,
        unifiedCompanyId: profile.companyId,
      };

      this.assertRouteCompanyAccess(request, profile.companyId);

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private bearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  }

  private assertRouteCompanyAccess(
    request: PlatformCompanyAuthenticatedRequest,
    profileCompanyId: number,
  ): void {
    const routeCompanyId = this.routeCompanyId(request);

    if (routeCompanyId === null || routeCompanyId === profileCompanyId) {
      return;
    }

    throw new ForbiddenException("You do not have access to this company.");
  }

  private routeCompanyId(request: Request): number | null {
    const companyId = request.params?.companyId;

    if (!isString(companyId)) {
      return null;
    }

    const parsed = Number(companyId);
    return Number.isInteger(parsed) ? parsed : null;
  }
}
