import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { isString } from "es-toolkit/compat";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { FieldFlowAuthService, FieldFlowJwtPayload } from "../fieldflow-auth.service";

@Injectable()
export class FieldFlowAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly fieldFlowAuthService: FieldFlowAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<FieldFlowJwtPayload>(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      if (payload.type !== "fieldflow") {
        throw new UnauthorizedException("Invalid token type");
      }

      const session = await this.fieldFlowAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException("Session expired or invalid");
      }

      request["fieldflowUser"] = {
        userId: payload.sub,
        email: payload.email,
        sessionToken: payload.sessionToken,
      };

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
