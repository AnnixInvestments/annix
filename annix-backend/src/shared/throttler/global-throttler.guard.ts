import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { clientIpFromRequest } from "../../lib/client-ip";

// Coarse per-process DoS backstop applied to every route (in-memory storage, no
// Mongo writes). It is NOT an exact cross-fleet cap: with N Fly machines the
// effective ceiling is limit × N and which machine an IP lands on varies, so
// precise/shared limits stay on the selective Mongo-backed guards (auth, AI).
@Injectable()
export class GlobalThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return `global:${clientIpFromRequest(req)}`;
  }
}
