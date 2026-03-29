import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

export interface FeedbackSubmitter {
  type: string;
  userId: number;
  displayName: string;
  email: string;
}

@Injectable()
export class FeedbackAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = this.jwtService.verify(token);

      const submitter: FeedbackSubmitter = {
        type: payload.type || "admin",
        userId: payload.sub,
        displayName:
          payload.name ||
          `${payload.firstName || ""} ${payload.lastName || ""}`.trim() ||
          payload.email,
        email: payload.email,
      };

      request["feedbackSubmitter"] = submitter;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
