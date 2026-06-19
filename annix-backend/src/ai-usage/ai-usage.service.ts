import { Injectable, Logger } from "@nestjs/common";
import { now } from "../lib/datetime";
import { estimateAiCostUsd } from "./ai-pricing";
import { AiUsageDailyPoint, AiUsageLogRepository } from "./ai-usage.repository";
import { AiApp, AiProvider } from "./entities/ai-usage-log.entity";

export interface LogAiUsageDto {
  app: AiApp;
  actionType: string;
  provider: AiProvider;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  pageCount?: number;
  processingTimeMs?: number;
  contextInfo?: Record<string, unknown>;
}

export interface AiUsageQueryDto {
  app?: AiApp;
  provider?: AiProvider;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
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

export interface AiUsageDailySeriesResponse {
  days: AiUsageDailyPoint[];
}

export interface AiUsageListResponse {
  data: AiUsageGroupRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalTokens: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  };
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly repo: AiUsageLogRepository) {}

  log(dto: LogAiUsageDto): void {
    const inputTokens = dto.inputTokens ?? null;
    const outputTokens = dto.outputTokens ?? null;
    const tokensUsed =
      dto.tokensUsed ??
      (inputTokens !== null || outputTokens !== null
        ? (inputTokens ?? 0) + (outputTokens ?? 0)
        : null);
    const costUsd = estimateAiCostUsd(dto.model, inputTokens, outputTokens, tokensUsed);
    this.repo
      .create({
        app: dto.app,
        actionType: dto.actionType,
        provider: dto.provider,
        model: dto.model ?? null,
        tokensUsed,
        inputTokens,
        outputTokens,
        cachedInputTokens: dto.cachedInputTokens ?? null,
        costUsd,
        pageCount: dto.pageCount ?? null,
        processingTimeMs: dto.processingTimeMs ?? null,
        contextInfo: dto.contextInfo ?? null,
      })
      .catch((error) => {
        this.logger.error(`Failed to log AI usage: ${error.message}`);
      });
  }

  async aggregateDailyUsageByModel(
    model: string,
    since: Date,
  ): Promise<{ calls: number; tokens: number }> {
    return this.repo.aggregateDailyUsageByModel(model, since);
  }

  async aggregateDailyUsageByActionType(
    actionType: string,
    since: Date,
  ): Promise<{ calls: number; tokens: number }> {
    return this.repo.aggregateDailyUsageByActionType(actionType, since);
  }

  async dailySeries(days: number): Promise<AiUsageDailySeriesResponse> {
    const clamped = Math.min(Math.max(Math.round(days) || 28, 7), 90);
    const start = now()
      .minus({ days: clamped - 1 })
      .startOf("day");
    const rows = await this.repo.dailySeries(start.toJSDate());
    const byDate = new Map(rows.map((row) => [row.date, row]));
    const series = Array.from({ length: clamped }, (_, index) => {
      const date = start.plus({ days: index }).toFormat("yyyy-MM-dd");
      const existing = byDate.get(date);
      return (
        existing ?? {
          date,
          calls: 0,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        }
      );
    });
    return { days: series };
  }

  async dailyTotals(since: Date): Promise<{ calls: number; tokens: number }> {
    const summary = await this.repo.sumUsage(null, null, since.toISOString(), null);
    return { calls: summary.totalCalls, tokens: summary.totalTokens };
  }

  async usageLogs(query: AiUsageQueryDto): Promise<AiUsageListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const app = query.app ?? null;
    const provider = query.provider ?? null;
    const from = query.from ?? null;
    const to = query.to ?? null;

    const [summary, rows, total] = await Promise.all([
      this.repo.sumUsage(app, provider, from, to),
      this.repo.queryGroupedUsage(app, provider, from, to, offset, limit),
      this.repo.countDistinctGroups(app, provider, from, to),
    ]);

    return {
      data: rows,
      total,
      page,
      limit,
      summary: {
        totalTokens: summary.totalTokens,
        totalCalls: summary.totalCalls,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        totalCostUsd: summary.totalCostUsd,
      },
    };
  }
}
