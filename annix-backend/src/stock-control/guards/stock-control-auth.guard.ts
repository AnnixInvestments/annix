import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlProfile } from "../entities/stock-control-profile.entity";

@Injectable()
export class StockControlAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(StockControlProfile)
    private readonly profileRepo: Repository<StockControlProfile>,
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

      const profile = await this.profileRepo.findOne({
        where: { userId: payload.sub },
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        companyId: profile?.companyId ?? payload.companyId,
        unifiedUserId: payload.sub,
        unifiedCompanyId: profile?.companyId ?? payload.companyId,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
