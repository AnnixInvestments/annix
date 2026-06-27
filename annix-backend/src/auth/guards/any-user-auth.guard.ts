import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { AdminAuthService } from "../../admin/admin-auth.service";
import { resolveAnnixOrbitJwtSecret } from "../../annix-orbit/annix-orbit.constants";
import { CustomerAuthService } from "../../customer/customer-auth.service";
import { SupplierAuthService } from "../../supplier/supplier-auth.service";
import { UserRepository } from "../../user/user.repository";

export interface AnyUserJwtPayload {
  sub: number;
  email: string;
  type: "admin" | "customer" | "supplier" | "stock-control" | "annix-orbit";
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
  type: "admin" | "customer" | "supplier" | "stock-control" | "annix-orbit";
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
    private readonly userRepository: UserRepository,
  ) {}

  // Stock-control and annix-orbit JWTs both carry the CORE unified User id as
  // `sub` (signed by us, ~1h expiry). The token alone proved identity but never
  // checked that the account is still active, so a deactivated user kept access
  // for the token's lifetime (#402 security-3). Re-check the persisted core
  // User — the same record rbac.deactivateUser flips to "deactivated".
  private async assertCoreUserActive(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status === "deactivated") {
      throw new UnauthorizedException("This account is no longer active.");
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const payload = await this.verifyWithKnownSecrets(token);

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

  /**
   * Tries each portal's signing secret in turn so the guard can accept
   * tokens issued by any of admin/customer/supplier/stock-control (signed
   * with JWT_SECRET) AND annix-orbit (signed with ANNIX_ORBIT_JWT_SECRET,
   * with CV_ASSISTANT_JWT_SECRET kept as a fallback so deployments don't
   * have to rotate their .env in the same change).
   * Returns the decoded payload from whichever secret verified, or throws
   * UnauthorizedException when none of them did.
   */
  private async verifyWithKnownSecrets(token: string): Promise<AnyUserJwtPayload> {
    const orbitSecret = resolveAnnixOrbitJwtSecret(this.configService);
    const secrets = [this.configService.get<string>("JWT_SECRET"), orbitSecret].filter(
      (s): s is string => Boolean(s),
    );

    let lastError: unknown = null;
    for (const secret of secrets) {
      try {
        return await this.jwtService.verifyAsync<AnyUserJwtPayload>(token, { secret });
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new UnauthorizedException("Invalid token");
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
      // Stock Control tokens don't carry a separate session_token — the JWT
      // itself is the session credential (signed by us, refreshed via
      // /stock-control/auth/refresh). Re-check the core User is still active so
      // deactivation revokes outstanding tokens; companyId/role stay from the
      // signed (non-forgeable) payload.
      await this.assertCoreUserActive(payload.sub);
      return {
        userId: payload.sub,
        email: payload.email,
        type: "stock-control",
        companyId: payload.companyId,
        role: payload.role,
        name: payload.name,
      };
    }

    if (payload.type === "annix-orbit") {
      // Same model as stock-control — the JWT is the credential (refreshed via
      // /annix-orbit/auth/refresh). `sub` is the CORE User id, so re-check the
      // core User is still active (the prior fix wrongly resolved this against
      // the legacy Orbit user table and 401'd every live user).
      await this.assertCoreUserActive(payload.sub);
      return {
        userId: payload.sub,
        email: payload.email,
        type: "annix-orbit",
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
