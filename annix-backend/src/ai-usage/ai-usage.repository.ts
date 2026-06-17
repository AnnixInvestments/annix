import { CrudRepository } from "../lib/persistence/crud-repository";
import { AiUsageLog } from "./entities/ai-usage-log.entity";

export interface AiUsageDailySummary {
  calls: number;
  tokens: number;
}

export interface AiUsageDailyPoint {
  date: string;
  calls: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiUsageGroupRow {
  date: string;
  app: string;
  actionType: string;
  provider: string;
  model: string | null;
  totalCalls: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalPages: number;
  totalTimeMs: number;
}

export abstract class AiUsageLogRepository extends CrudRepository<AiUsageLog> {
  abstract aggregateDailyUsageByModel(model: string, since: Date): Promise<AiUsageDailySummary>;
  abstract dailySeries(since: Date): Promise<AiUsageDailyPoint[]>;
  abstract queryGroupedUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
    offset: number,
    limit: number,
  ): Promise<AiUsageGroupRow[]>;
  abstract countDistinctGroups(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<number>;
  abstract sumUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<{
    totalTokens: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  }>;
}
