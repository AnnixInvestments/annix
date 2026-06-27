import { ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";

import { AnyUserAuthGuard } from "./any-user-auth.guard";

/**
 * Optional variant of {@link AnyUserAuthGuard} for endpoints that serve both
 * authenticated portal users AND legitimate anonymous funnels (anonymous RFQ
 * drafts, public supplier registration, customer magic-link clarifications).
 *
 * It NEVER throws: a missing, invalid, or expired token resolves to
 * `req.authUser = null` and the request proceeds. A valid token attaches the
 * same {@link AuthenticatedUser} the parent guard would. Routes can then derive
 * a real userId when present and fall back to their own anonymous scope
 * otherwise — without 401ing the anonymous path the way the binary guard does.
 *
 * Reuses the parent's DI (JwtService, ConfigService, AdminAuthService,
 * CustomerAuthService, SupplierAuthService) and its token-verification helpers
 * unchanged — no parallel auth logic.
 */
@Injectable()
export class OptionalAnyUserAuthGuard extends AnyUserAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      request["authUser"] = null;
      return true;
    }

    try {
      const payload = await this.verifyWithKnownSecrets(token);
      request["authUser"] = await this.validateSessionByType(payload);
    } catch {
      request["authUser"] = null;
    }

    return true;
  }
}
