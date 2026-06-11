import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../../annix-orbit/annix-orbit.constants";

export interface FeedbackSubmitter {
  type: string;
  userId: number;
  displayName: string;
  email: string;
  role?: string;
  companyId?: number;
}

interface DecodedFeedbackToken {
  sub: number;
  email: string;
  type?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  companyId?: number;
}

@Injectable()
export class FeedbackAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    const token =
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
      request.cookies?.["comply_sa_token"] ||
      null;

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    const payload = this.verifyAcrossPortals(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const submitter: FeedbackSubmitter = {
      type: payload.type || "admin",
      userId: payload.sub,
      displayName:
        payload.name ||
        `${payload.firstName || ""} ${payload.lastName || ""}`.trim() ||
        payload.email,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };

    request["feedbackSubmitter"] = submitter;
    return true;
  }

  private verifyAcrossPortals(token: string): DecodedFeedbackToken | null {
    const orbitSecret = this.configService.get<string>(
      "ANNIX_ORBIT_JWT_SECRET",
      ANNIX_ORBIT_JWT_SECRET_DEFAULT,
    );
    const candidateSecrets: Array<string | undefined> = [undefined, orbitSecret];

    return candidateSecrets.reduce<DecodedFeedbackToken | null>((found, secret) => {
      if (found) {
        return found;
      }
      try {
        return secret
          ? this.jwtService.verify<DecodedFeedbackToken>(token, { secret })
          : this.jwtService.verify<DecodedFeedbackToken>(token);
      } catch {
        return null;
      }
    }, null);
  }
}
