import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { isString } from "es-toolkit/compat";
import { Request } from "express";
import { TeamRole } from "../../entities/team-member.entity";
import { TeamService } from "../../services/team.service";
import { AnnixRepAuthService, AnnixRepJwtPayload } from "../fieldflow-auth.service";

export interface AnnixRepUser {
  userId: number;
  email: string;
  sessionToken: string;
  organizationId?: number;
  teamRole?: TeamRole;
}

@Injectable()
export class AnnixRepAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly annixRepAuthService: AnnixRepAuthService,
    private readonly teamService: TeamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AnnixRepJwtPayload>(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      if (payload.type !== "annixRep") {
        throw new UnauthorizedException("Invalid token type");
      }

      const session = await this.annixRepAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException("Session expired or invalid");
      }

      const annixRepUser: AnnixRepUser = {
        userId: payload.sub,
        email: payload.email,
        sessionToken: payload.sessionToken,
      };

      const member = await this.teamService.memberByUserAnyOrg(payload.sub);
      if (member) {
        annixRepUser.organizationId = member.organizationId;
        annixRepUser.teamRole = member.role;
      }

      request["annixRepUser"] = annixRepUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    if (type === "Bearer" && token) {
      return token;
    }
    const queryToken = request.query.token;
    if (isString(queryToken)) {
      return queryToken;
    }
    return undefined;
  }
}
