import { Logger } from "@nestjs/common";
import { nowMillis } from "./datetime";

const SAGE_MAX_REQUESTS_PER_MINUTE = 100;
const SAGE_MAX_REQUESTS_PER_DAY = 2500;
const SAGE_MIN_INTERVAL_MS = 1000;

interface CompanyBucket {
  minuteTimestamps: number[];
  dayTimestamps: number[];
  lastRequestMs: number;
}

export class SageRateLimiter {
  private readonly logger = new Logger(SageRateLimiter.name);
  private readonly buckets = new Map<string, CompanyBucket>();

  private bucket(companyKey: string): CompanyBucket {
    const existing = this.buckets.get(companyKey);
    if (existing) {
      return existing;
    }
    const fresh: CompanyBucket = {
      minuteTimestamps: [],
      dayTimestamps: [],
      lastRequestMs: 0,
    };
    this.buckets.set(companyKey, fresh);
    return fresh;
  }

  private pruneTimestamps(timestamps: number[], windowMs: number, currentMs: number): number[] {
    return timestamps.filter((ts) => currentMs - ts < windowMs);
  }

  async waitForSlot(companyKey: string): Promise<void> {
    const b = this.bucket(companyKey);
    const currentMs = nowMillis();

    b.minuteTimestamps = this.pruneTimestamps(b.minuteTimestamps, 60_000, currentMs);
    b.dayTimestamps = this.pruneTimestamps(b.dayTimestamps, 86_400_000, currentMs);

    if (b.dayTimestamps.length >= SAGE_MAX_REQUESTS_PER_DAY) {
      const oldestDay = b.dayTimestamps[0] ?? currentMs;
      const waitMs = 86_400_000 - (currentMs - oldestDay) + 100;
      this.logger.warn(
        `Sage daily limit reached for ${companyKey} (${SAGE_MAX_REQUESTS_PER_DAY}/day). Rejecting request.`,
      );
      throw new Error(
        `Sage API daily rate limit exceeded for company ${companyKey}. ${SAGE_MAX_REQUESTS_PER_DAY} requests/day allowed. Try again in ${Math.ceil(waitMs / 60_000)} minutes.`,
      );
    }

    if (b.minuteTimestamps.length >= SAGE_MAX_REQUESTS_PER_MINUTE) {
      const oldestMinute = b.minuteTimestamps[0] ?? currentMs;
      const waitMs = 60_000 - (currentMs - oldestMinute) + 100;
      this.logger.warn(
        `Sage per-minute limit reached for ${companyKey}. Waiting ${waitMs}ms.`,
      );
      await this.delay(waitMs);
      b.minuteTimestamps = this.pruneTimestamps(b.minuteTimestamps, 60_000, nowMillis());
    }

    const sinceLast = nowMillis() - b.lastRequestMs;
    if (sinceLast < SAGE_MIN_INTERVAL_MS && b.lastRequestMs > 0) {
      const waitMs = SAGE_MIN_INTERVAL_MS - sinceLast;
      await this.delay(waitMs);
    }

    const ts = nowMillis();
    b.minuteTimestamps = [...b.minuteTimestamps, ts];
    b.dayTimestamps = [...b.dayTimestamps, ts];
    b.lastRequestMs = ts;
  }

  minuteCount(companyKey: string): number {
    const b = this.buckets.get(companyKey);
    if (!b) {
      return 0;
    }
    return this.pruneTimestamps(b.minuteTimestamps, 60_000, nowMillis()).length;
  }

  dayCount(companyKey: string): number {
    const b = this.buckets.get(companyKey);
    if (!b) {
      return 0;
    }
    return this.pruneTimestamps(b.dayTimestamps, 86_400_000, nowMillis()).length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const sageRateLimiter = new SageRateLimiter();

export const SAGE_RATE_LIMITS = {
  MAX_PER_MINUTE: SAGE_MAX_REQUESTS_PER_MINUTE,
  MAX_PER_DAY: SAGE_MAX_REQUESTS_PER_DAY,
  MIN_INTERVAL_MS: SAGE_MIN_INTERVAL_MS,
} as const;

export const SAGE_HEAVY_ENDPOINTS = [
  "DetailedLedgerTransaction",
  "CustomerAgeing",
  "SupplierAgeing",
  "CustomerStatement",
  "SupplierStatement",
  "AccountBalance",
  "CashMovement",
  "ItemMovement",
  "OutstandingCustomerDocuments",
  "OutstandingSupplierDocuments",
  "TransactionListing",
  "Allocations",
  "Budget",
  "TakeOnBalance",
  "TrialBalance",
  "TaxReport",
] as const;
