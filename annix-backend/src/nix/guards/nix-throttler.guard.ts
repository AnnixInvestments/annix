import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { clientIpFromRequest } from "../../lib/request-ip";

/**
 * IP-only throttler for the public/anonymous Nix endpoints (anonymous RFQ
 * uploads, supplier-registration document annotation, customer magic-link
 * clarification uploads). These routes cannot carry a per-user identity, so the
 * client IP is the only stable abuse key — keying IP-only (rather than the
 * ip:email pair {@link CoreAuthThrottlerGuard} uses) caps Gemini cost / poisoning
 * floods from a single source regardless of body content.
 *
 * Authenticated callers are skipped entirely (see {@link shouldSkip}): the cost
 * caps are an ANONYMOUS-only control, and an IP-only limit would otherwise
 * punish many signed-in users sharing one corporate NAT IP or a single user's
 * legitimate bulk RFQ upload. This guard must run AFTER OptionalAnyUserAuthGuard
 * so `req.authUser` is populated by the time shouldSkip reads it.
 *
 * Backed by the shared {@link MongoThrottlerStorage} (the `throttler_hits`
 * collection) via the app's ThrottlerModule storage provider — no new store.
 *
 * IP extraction mirrors CoreAuthThrottlerGuard: x-forwarded-for (first hop,
 * correct behind Fly.io's proxy) → req.ip → socket.remoteAddress.
 */
@Injectable()
export class NixThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    return request.authUser != null;
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return `nix:${clientIpFromRequest(req)}`;
  }
}
