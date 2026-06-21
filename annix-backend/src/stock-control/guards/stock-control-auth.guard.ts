import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";

@Injectable()
export class StockControlAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly profileRepo: StockControlProfileRepository,
    private readonly userRepo: StockControlUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const queryToken = request.query?.token as string | undefined;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : queryToken
        ? queryToken
        : null;

    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    try {
      const payload = this.jwtService.verify(token);

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
        ? await this.userRepo.findById(profile.legacyScUserId)
        : null;
      const role = scUser?.role || StockControlRole.STOREMAN;

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role,
        companyId: profile.companyId,
        unifiedUserId: payload.sub,
        unifiedCompanyId: profile.companyId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
