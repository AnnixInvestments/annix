import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { now } from "../../lib/datetime";
import type { ThrottlerHit } from "../../shared/throttler/throttler-hit.schema";

/**
 * Global daily ceiling on ANONYMOUS Gemini-spending Nix requests — a botnet
 * backstop the per-IP throttle can't provide (a distributed set of IPs each
 * stays under its own limit). Authenticated requests never count toward, nor
 * are blocked by, this ceiling.
 *
 * Storage reuses the shared `throttler_hits` collection (no new collection): a
 * single counter doc keyed `nix-anon-gemini:YYYY-MM-DD`, atomically `$inc`-ed
 * per anonymous Gemini request. The date in the key resets the counter daily;
 * the TTL index on `expiresAt` reaps the previous day's doc.
 */
export const NIX_ANON_GEMINI_DAILY_CAP = (() => {
  const parsed = Number(process.env.NIX_ANON_GEMINI_DAILY_CAP);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 500;
})();

@Injectable()
export class NixAnonGeminiCeilingService {
  private readonly logger = new Logger(NixAnonGeminiCeilingService.name);

  // Per-instance "cap already blown for this date" latch — once set, requests
  // short-circuit WITHOUT touching the hot counter doc (the only unbounded-
  // under-flood M0 writer otherwise). Cleared on date rollover. Fail-closed.
  private exceededDateKey: string | null = null;

  constructor(@InjectModel("ThrottlerHit") private readonly model: Model<ThrottlerHit>) {}

  /**
   * Atomically records `count` anonymous Gemini requests against today's
   * counter and returns whether the day is still under the cap. Returns false
   * (and logs an alertable warning) once the cap is exceeded, so the caller can
   * reject anonymous Gemini requests with a friendly "service busy" 429.
   */
  async tryConsume(count: number = 1): Promise<boolean> {
    const today = now();
    const dateKey = today.toFormat("yyyy-MM-dd");

    // Date rollover resets the latch (a new day's counter starts fresh).
    if (this.exceededDateKey != null && this.exceededDateKey !== dateKey) {
      this.exceededDateKey = null;
    }
    // Already over the cap today → reject without another counter write.
    if (this.exceededDateKey === dateKey) {
      return false;
    }

    const key = `nix-anon-gemini:${dateKey}`;
    const expiresAt = today.plus({ days: 2 }).toJSDate();

    const doc = await this.model
      .findOneAndUpdate(
        { key },
        { $inc: { totalHits: count }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true, lean: true },
      )
      .exec();

    const totalHits = doc?.totalHits ?? count;
    if (totalHits > NIX_ANON_GEMINI_DAILY_CAP) {
      this.exceededDateKey = dateKey;
      this.logger.warn(
        `Anonymous Nix Gemini daily ceiling exceeded for ${dateKey}: ${totalHits}/${NIX_ANON_GEMINI_DAILY_CAP}. Rejecting anonymous Gemini requests until tomorrow.`,
      );
      return false;
    }
    return true;
  }
}
