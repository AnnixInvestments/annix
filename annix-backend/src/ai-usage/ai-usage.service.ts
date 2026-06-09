import { Injectable, Logger } from "@nestjs/common";
import { AiUsageLogRepository } from "./ai-usage.repository";
import { AiApp, AiProvider } from "./entities/ai-usage-log.entity";

export interface LogAiUsageDto {
  app: AiApp;
  actionType: string;
  provider: AiProvider;
  model?: string;
  tokensUsed?: number;
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
  totalPages: number;
  totalTimeMs: number;
}

export interface AiUsageListResponse {
  data: AiUsageGroupRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalTokens: number;
    totalCalls: number;
  };
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly repo: AiUsageLogRepository) {}

  log(dto: LogAiUsageDto): void {
    this.repo
      .create({
        app: dto.app,
        actionType: dto.actionType,
        provider: dto.provider,
        model: dto.model ?? null,
        tokensUsed: dto.tokensUsed ?? null,
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
      },
    };
  }
}
