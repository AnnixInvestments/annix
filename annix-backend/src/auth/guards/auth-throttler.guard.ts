import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { clientIpFromRequest } from "../../lib/client-ip";

@Injectable()
export class CoreAuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = clientIpFromRequest(req);
    const body = (req.body ?? {}) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    return email ? `core-auth:${ip}:${email}` : `core-auth:${ip}`;
  }
}
