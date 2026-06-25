import { timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

// Shields the public inbound-email webhooks (which can now create customer
// records from attachment content) behind a shared secret. Rollout-safe: when
// INBOUND_EMAIL_WEBHOOK_SECRET is unset the guard allows traffic and warns, so
// deploying does not break inbound email before the secret is configured on
// both the app and the email provider. Once set, a matching
// `x-inbound-webhook-secret` header (or `Authorization: Bearer <secret>`) is
// required.
@Injectable()
export class InboundEmailWebhookGuard implements CanActivate {
  private readonly logger = new Logger(InboundEmailWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn(
        "INBOUND_EMAIL_WEBHOOK_SECRET is not set — inbound-email webhooks are UNAUTHENTICATED. Set it on the app and the email provider to enforce.",
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerSecret = request.headers["x-inbound-webhook-secret"];
    const provided =
      (typeof headerSecret === "string" ? headerSecret : null) ??
      this.bearerToken(request.headers.authorization);

    if (provided && this.safeEqual(provided, secret)) {
      return true;
    }

    this.logger.warn("Rejected inbound-email webhook: missing or invalid secret");
    throw new UnauthorizedException("Invalid inbound-email webhook credentials");
  }

  private bearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match ? match[1] : null;
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }
}
