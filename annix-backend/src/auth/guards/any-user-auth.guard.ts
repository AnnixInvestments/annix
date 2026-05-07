import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { AdminAuthService } from "../../admin/admin-auth.service";
import { CustomerAuthService } from "../../customer/customer-auth.service";
import { SupplierAuthService } from "../../supplier/supplier-auth.service";

export interface AnyUserJwtPayload {
  sub: number;
  email: string;
  type: "admin" | "customer" | "supplier" | "stock-control";
  sessionToken?: string;
  customerId?: number;
  supplierId?: number;
  companyId?: number;
  role?: string;
  name?: string;
  roles?: string[];
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  type: "admin" | "customer" | "supplier" | "stock-control";
  customerId?: number;
  supplierId?: number;
  companyId?: number;
  role?: string;
  name?: string;
  roles?: string[];
}

@Injectable()
export class AnyUserAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly supplierAuthService: SupplierAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AnyUserJwtPayload>(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      const authUser = await this.validateSessionByType(payload);
      request["authUser"] = authUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid token");
    }
  }

  private async validateSessionByType(payload: AnyUserJwtPayload): Promise<AuthenticatedUser> {
    if (payload.type === "admin") {
      if (!payload.sessionToken) {
        throw new UnauthorizedException("Missing session token");
      }
      const user = await this.adminAuthService.validateSession(payload.sessionToken);
      if (!user) {
        throw new UnauthorizedException("Session expired or invalid");
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: "admin",
        roles: user.roles?.map((r) => r.name) || [],
      };
    }

    if (payload.type === "customer") {
      if (!payload.sessionToken) {
        throw new UnauthorizedException("Missing session token");
      }
      const session = await this.customerAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException("Session expired or invalid");
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: "customer",
        customerId: payload.customerId,
      };
    }

    if (payload.type === "supplier") {
      if (!payload.sessionToken) {
        throw new UnauthorizedException("Missing session token");
      }
      const session = await this.supplierAuthService.verifySession(payload.sessionToken);
      if (!session) {
        throw new UnauthorizedException("Session expired or invalid");
      }
      return {
        userId: payload.sub,
        email: payload.email,
        type: "supplier",
        supplierId: payload.supplierId,
      };
    }

    if (payload.type === "stock-control") {
      // Stock Control tokens don't carry a separate session_token — the
      // JWT itself is the session credential (it's signed by us, has a 1-hour
      // expiry, and is refreshed via /stock-control/auth/refresh). The
      // signature + expiry verification done above is sufficient.
      // Accept and surface the SC-specific fields (companyId, role) so
      // downstream guards/services can scope to the right tenant.
      return {
        userId: payload.sub,
        email: payload.email,
        type: "stock-control",
        companyId: payload.companyId,
        role: payload.role,
        name: payload.name,
      };
    }

    throw new UnauthorizedException("Invalid token type");
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
