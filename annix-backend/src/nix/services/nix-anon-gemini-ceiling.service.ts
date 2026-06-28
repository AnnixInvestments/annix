import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { now } from "../../lib/datetime";
import type { ThrottlerHit } from "../../shared/throttler/throttler-hit.schema";

/**
 * Global daily ceilings on ANONYMOUS cost-bearing Nix requests — a botnet
 * backstop the per-IP throttle can't provide (a distributed set of IPs each
 * stays under its own limit). Two independent counters:
 *  - Gemini-spending requests (token cost) — `nix-anon-gemini:YYYY-MM-DD`.
 *  - Local-CPU requests (Ghostscript/Tesseract rasterise + OCR, no tokens but
 *    they exhaust the shared Fly VM) — `nix-anon-cpu:YYYY-MM-DD`.
 * Authenticated requests never count toward, nor are blocked by, either ceiling.
 *
 * Storage reuses the shared `throttler_hits` collection (no new collection): one
 * counter doc per kind per day, atomically `$inc`-ed. The date in the key resets
 * the counter daily; the TTL index on `expiresAt` reaps the previous day's doc.
 */
function capFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export const NIX_ANON_GEMINI_DAILY_CAP = capFromEnv("NIX_ANON_GEMINI_DAILY_CAP", 500);
export const NIX_ANON_CPU_DAILY_CAP = capFromEnv("NIX_ANON_CPU_DAILY_CAP", 2000);

@Injectable()
export class NixAnonGeminiCeilingService {
  private readonly logger = new Logger(NixAnonGeminiCeilingService.name);

  // Per-instance, per-counter "cap already blown for this date" latch — once
  // set, requests short-circuit WITHOUT touching the hot counter doc (the only
  // unbounded-under-flood M0 writer otherwise). Cleared on date rollover.
  // Fail-closed.
  private readonly exceededDateKeys = new Map<string, string>();

  constructor(@InjectModel("ThrottlerHit") private readonly model: Model<ThrottlerHit>) {}

  /**
   * Records `count` anonymous Gemini-spending requests against today's counter;
   * false once the daily cap is exceeded (caller rejects with a 429).
   */
  async tryConsume(count: number = 1): Promise<boolean> {
    return this.consume("nix-anon-gemini", NIX_ANON_GEMINI_DAILY_CAP, count);
  }

  /**
   * Records `count` anonymous local-CPU requests (document-pages / region OCR)
   * against today's counter; false once the daily cap is exceeded.
   */
  async tryConsumeCpu(count: number = 1): Promise<boolean> {
    return this.consume("nix-anon-cpu", NIX_ANON_CPU_DAILY_CAP, count);
  }

  private async consume(keyPrefix: string, cap: number, count: number): Promise<boolean> {
    const today = now();
    const dateKey = today.toFormat("yyyy-MM-dd");

    // Date rollover resets the latch (a new day's counter starts fresh).
    const latched = this.exceededDateKeys.get(keyPrefix);
    if (latched != null && latched !== dateKey) {
      this.exceededDateKeys.delete(keyPrefix);
    }
    // Already over the cap today → reject without another counter write.
    if (this.exceededDateKeys.get(keyPrefix) === dateKey) {
      return false;
    }

    const key = `${keyPrefix}:${dateKey}`;
    const expiresAt = today.plus({ days: 2 }).toJSDate();

    const doc = await this.model
      .findOneAndUpdate(
        { key },
        { $inc: { totalHits: count }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true, lean: true },
      )
      .exec();

    const totalHits = doc?.totalHits ?? count;
    if (totalHits > cap) {
      this.exceededDateKeys.set(keyPrefix, dateKey);
      this.logger.warn(
        `Anonymous Nix daily ceiling exceeded for ${key}: ${totalHits}/${cap}. Rejecting anonymous requests of this kind until tomorrow.`,
      );
      return false;
    }
    return true;
  }
}
