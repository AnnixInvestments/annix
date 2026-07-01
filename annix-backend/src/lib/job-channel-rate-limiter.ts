import { Logger } from "@nestjs/common";
import { nowMillis } from "./datetime";

export interface ChannelRateLimits {
  maxPerMinute: number;
  maxPerDay: number;
  minIntervalMs: number;
}

interface Bucket {
  minuteTimestamps: number[];
  dayTimestamps: number[];
  lastRequestMs: number;
}

/**
 * Per-(channel, company) token bucket for outbound paid/api job-channel calls —
 * mirrors {@link SageRateLimiter}. Enforces a per-minute cap (waits), a daily
 * cap (throws so the orchestrator records a retryable failure), and a minimum
 * spacing between calls. In-memory: a rate limiter, not a budget ledger — hard
 * spend caps live in the persisted cost guard.
 */
export class JobChannelRateLimiter {
  private readonly logger = new Logger(JobChannelRateLimiter.name);
  private readonly buckets = new Map<string, Bucket>();

  private bucket(key: string): Bucket {
    const existing = this.buckets.get(key);
    if (existing) return existing;
    const fresh: Bucket = { minuteTimestamps: [], dayTimestamps: [], lastRequestMs: 0 };
    this.buckets.set(key, fresh);
    return fresh;
  }

  private prune(timestamps: number[], windowMs: number, currentMs: number): number[] {
    return timestamps.filter((ts) => currentMs - ts < windowMs);
  }

  /** Acquire a slot for `key` (`${channelCode}:${companyId}`), waiting or throwing. */
  async acquire(key: string, limits: ChannelRateLimits): Promise<void> {
    const b = this.bucket(key);
    const currentMs = nowMillis();
    b.minuteTimestamps = this.prune(b.minuteTimestamps, 60_000, currentMs);
    b.dayTimestamps = this.prune(b.dayTimestamps, 86_400_000, currentMs);

    if (b.dayTimestamps.length >= limits.maxPerDay) {
      this.logger.warn(`Channel daily limit reached for ${key} (${limits.maxPerDay}/day).`);
      throw new Error(
        `Job channel daily rate limit exceeded for ${key} (${limits.maxPerDay}/day).`,
      );
    }

    if (b.minuteTimestamps.length >= limits.maxPerMinute) {
      const oldestMinute = b.minuteTimestamps[0] ?? currentMs;
      const waitMs = 60_000 - (currentMs - oldestMinute) + 100;
      this.logger.warn(`Channel per-minute limit reached for ${key}. Waiting ${waitMs}ms.`);
      await this.delay(waitMs);
      b.minuteTimestamps = this.prune(b.minuteTimestamps, 60_000, nowMillis());
    }

    const sinceLast = nowMillis() - b.lastRequestMs;
    if (b.lastRequestMs > 0 && sinceLast < limits.minIntervalMs) {
      await this.delay(limits.minIntervalMs - sinceLast);
    }

    const ts = nowMillis();
    b.minuteTimestamps = [...b.minuteTimestamps, ts];
    b.dayTimestamps = [...b.dayTimestamps, ts];
    b.lastRequestMs = ts;
  }

  dayCount(key: string): number {
    const b = this.buckets.get(key);
    if (!b) return 0;
    return this.prune(b.dayTimestamps, 86_400_000, nowMillis()).length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const jobChannelRateLimiter = new JobChannelRateLimiter();

// Conservative default limits for a paid/api channel. Real integrations should
// override per their provider's published quotas.
export const DEFAULT_PAID_CHANNEL_LIMITS: ChannelRateLimits = {
  maxPerMinute: 10,
  maxPerDay: 200,
  minIntervalMs: 1000,
};
