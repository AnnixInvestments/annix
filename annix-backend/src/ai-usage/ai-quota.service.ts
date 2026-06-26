import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection, mongo } from "mongoose";
import { now, nowMillis } from "../lib/datetime";
import { AiQuotaExceededError } from "./ai-quota.error";
import {
  type AiQuotaConfig,
  type AiQuotaLimits,
  type AiQuotaScope,
  aiQuotaConfig,
} from "./config/ai-quota.config";

export interface AiQuotaContext {
  app: string;
  companyId?: number;
  userId?: number;
  quotaScope?: AiQuotaScope;
}

interface CounterDoc {
  _id: string;
  count: number;
  expiresAt?: Date;
}

interface ResolvedQuota {
  key: string;
  limits: AiQuotaLimits;
}

const DAILY_READ_CACHE_TTL_MILLIS = 30_000;
const MAX_DAILY_CACHE_ENTRIES = 50_000;
const MAX_QUOTA_KEY_LENGTH = 96;
const COUNTERS_COLLECTION = "ai_quota_counters";

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);
  private readonly dailyReadCache = new Map<string, { tokens: number; expiresAtMillis: number }>();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async assertWithinQuota(context: AiQuotaContext): Promise<void> {
    const config = aiQuotaConfig();
    if (!config.enabled) {
      return;
    }
    const resolved = this.resolve(context, config);
    try {
      await this.enforce(resolved);
    } catch (error: unknown) {
      if (error instanceof AiQuotaExceededError) {
        if (config.shadow) {
          this.logger.warn(
            `[shadow] would block AI call (${error.reason}) for ${resolved.key} — not enforcing`,
          );
          return;
        }
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI quota check failed open (allowing call): ${message}`);
    }
  }

  debit(context: AiQuotaContext, tokens: number): void {
    const config = aiQuotaConfig();
    if (!config.enabled || tokens <= 0) {
      return;
    }
    const resolved = this.resolve(context, config);
    void this.incrementDailyTokens(resolved.key, tokens).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI quota debit failed (count under-reports until next call): ${message}`);
    });
  }

  private resolve(context: AiQuotaContext, config: AiQuotaConfig): ResolvedQuota {
    const scope: AiQuotaScope = context.quotaScope ?? "system";
    if (scope === "company" && context.companyId != null) {
      return { key: `company:${context.companyId}`, limits: config.company };
    }
    if (scope === "user" && context.userId != null) {
      return { key: `user:${context.userId}`, limits: config.user };
    }
    if (scope !== "system") {
      this.logger.warn(
        `AI quota scope "${scope}" had no id — falling back to the system bucket for app "${context.app}"`,
      );
    }
    const app = String(context.app).slice(0, MAX_QUOTA_KEY_LENGTH);
    return { key: `system:${app}`, limits: config.system };
  }

  private async enforce(resolved: ResolvedQuota): Promise<void> {
    const rateCount = await this.incrementMinuteCounter(resolved.key);
    if (rateCount > resolved.limits.ratePerMinute) {
      throw new AiQuotaExceededError("per-minute-rate", resolved.key, 60);
    }
    const spentToday = await this.dailyTokensSpent(resolved.key);
    if (spentToday >= resolved.limits.dailyTokenBudget) {
      throw new AiQuotaExceededError(
        "daily-token-budget",
        resolved.key,
        this.secondsUntilEndOfDay(),
      );
    }
  }

  private counters(): mongo.Collection<CounterDoc> | null {
    const db = this.connection.db;
    return db == null ? null : db.collection<CounterDoc>(COUNTERS_COLLECTION);
  }

  private async incrementMinuteCounter(key: string): Promise<number> {
    const counters = this.counters();
    if (counters == null) {
      return 0;
    }
    const id = `rate:${key}:${now().toFormat("yyyyMMddHHmm")}`;
    const doc = await counters.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: now().plus({ minutes: 2 }).toJSDate() } },
      { upsert: true, returnDocument: "after", projection: { count: 1 } },
    );
    return doc?.count ?? 1;
  }

  private async dailyTokensSpent(key: string): Promise<number> {
    const id = this.dailyId(key);
    const cached = this.dailyReadCache.get(id);
    if (cached != null && cached.expiresAtMillis > nowMillis()) {
      return cached.tokens;
    }
    const counters = this.counters();
    if (counters == null) {
      return 0;
    }
    const doc = await counters.findOne({ _id: id }, { projection: { count: 1 } });
    const tokens = doc?.count ?? 0;
    this.pruneCache();
    this.dailyReadCache.set(id, {
      tokens,
      expiresAtMillis: nowMillis() + DAILY_READ_CACHE_TTL_MILLIS,
    });
    return tokens;
  }

  private pruneCache(): void {
    const cutoffMillis = nowMillis();
    this.dailyReadCache.forEach((entry, key) => {
      if (entry.expiresAtMillis <= cutoffMillis) {
        this.dailyReadCache.delete(key);
      }
    });
    if (this.dailyReadCache.size > MAX_DAILY_CACHE_ENTRIES) {
      this.dailyReadCache.clear();
    }
  }

  private async incrementDailyTokens(key: string, tokens: number): Promise<void> {
    const id = this.dailyId(key);
    const cached = this.dailyReadCache.get(id);
    if (cached != null) {
      this.dailyReadCache.set(id, {
        tokens: cached.tokens + tokens,
        expiresAtMillis: cached.expiresAtMillis,
      });
    }
    const counters = this.counters();
    if (counters == null) {
      return;
    }
    await counters.updateOne(
      { _id: id },
      {
        $inc: { count: tokens },
        $setOnInsert: { expiresAt: now().endOf("day").plus({ hours: 2 }).toJSDate() },
      },
      { upsert: true },
    );
  }

  private dailyId(key: string): string {
    return `tok:${key}:${now().toFormat("yyyyMMdd")}`;
  }

  private secondsUntilEndOfDay(): number {
    return Math.max(1, Math.round(now().endOf("day").diffNow().as("seconds")));
  }
}
