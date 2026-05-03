import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import { User } from "../../user/entities/user.entity";
import { CV_ASSISTANT_JWT_SECRET_DEFAULT } from "../cv-assistant.constants";
import { CvAssistantRole } from "../entities/cv-assistant-user.entity";

@Injectable()
export class CvAssistantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserAppAccess)
    private readonly userAppAccessRepo: Repository<UserAppAccess>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    const secret = this.configService.get<string>(
      "CV_ASSISTANT_JWT_SECRET",
      CV_ASSISTANT_JWT_SECRET_DEFAULT,
    );

    try {
      const payload = this.jwtService.verify(token, { secret });

      if (payload.type !== "cv-assistant") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const userType = payload.userType ?? "company";
      const role =
        userType === "individual"
          ? CvAssistantRole.INDIVIDUAL
          : await this.resolveRole(user.id, payload.role);

      request.user = {
        id: user.id,
        email: user.email,
        name: payload.name,
        role,
        userType,
        companyId: payload.companyId ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private async resolveRole(userId: number, fallbackRole: string): Promise<string> {
    const access = await this.userAppAccessRepo.findOne({
      where: { userId, app: { code: "cv-assistant" } },
      relations: ["role"],
    });

    if (access?.role) {
      const roleMap: Record<string, string> = {
        viewer: CvAssistantRole.VIEWER,
        editor: CvAssistantRole.RECRUITER,
        administrator: CvAssistantRole.ADMIN,
      };
      return roleMap[access.role.code] || fallbackRole;
    }

    return fallbackRole || CvAssistantRole.VIEWER;
  }
}
