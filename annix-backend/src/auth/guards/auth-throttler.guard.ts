import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class CoreAuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const forwarded = headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === "string"
        ? forwarded.split(",")[0]
        : null;
    const socket = req.socket as { remoteAddress?: string } | undefined;
    const ip =
      forwardedIp?.trim() || (req.ip as string | undefined) || socket?.remoteAddress || "unknown";
    const body = (req.body ?? {}) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    return email ? `core-auth:${ip}:${email}` : `core-auth:${ip}`;
  }
}
