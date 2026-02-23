import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CvAssistantUser } from "../entities/cv-assistant-user.entity";

@Injectable()
export class CvAssistantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(CvAssistantUser)
    private readonly userRepo: Repository<CvAssistantUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== "cv-assistant") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: user?.role ?? payload.role,
        companyId: payload.companyId,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
