import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { isArray, isString } from "es-toolkit/compat";

@Injectable()
export class PaystackWebhookThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const forwarded = headers["x-forwarded-for"];
    const forwardedIp = isArray(forwarded)
      ? forwarded[0]
      : isString(forwarded)
        ? forwarded.split(",")[0]
        : null;
    const socket = req.socket as { remoteAddress?: string } | undefined;
    const ip =
      forwardedIp?.trim() || (req.ip as string | undefined) || socket?.remoteAddress || "unknown";
    return `paystack-webhook:${ip}`;
  }
}
