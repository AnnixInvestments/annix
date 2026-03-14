import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiApp, AiProvider, AiUsageLog } from "./entities/ai-usage-log.entity";

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

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly repo: Repository<AiUsageLog>,
  ) {}

  log(dto: LogAiUsageDto): void {
    this.repo
      .save({
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

  async usageLogs(query: AiUsageQueryDto): Promise<AiUsageListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const baseQb = this.repo.createQueryBuilder("log");

    if (query.app) {
      baseQb.andWhere("log.app = :app", { app: query.app });
    }
    if (query.provider) {
      baseQb.andWhere("log.provider = :provider", { provider: query.provider });
    }
    if (query.from) {
      baseQb.andWhere("log.createdAt >= :from", { from: query.from });
    }
    if (query.to) {
      baseQb.andWhere("log.createdAt <= :to", { to: query.to });
    }

    const summaryQb = baseQb.clone();

    const summaryResult = await summaryQb
      .select("COALESCE(SUM(log.tokensUsed), 0)", "totalTokens")
      .addSelect("COUNT(*)", "totalCalls")
      .getRawOne();

    const groupQb = baseQb.clone();
    groupQb
      .select("log.created_at::date", "date")
      .addSelect("log.app", "app")
      .addSelect("log.action_type", "actionType")
      .addSelect("log.provider", "provider")
      .addSelect("MAX(log.model)", "model")
      .addSelect("COUNT(*)::int", "totalCalls")
      .addSelect("COALESCE(SUM(log.tokens_used), 0)::int", "totalTokens")
      .addSelect("COALESCE(SUM(log.page_count), 0)::int", "totalPages")
      .addSelect("COALESCE(SUM(log.processing_time_ms), 0)::int", "totalTimeMs")
      .groupBy("log.created_at::date")
      .addGroupBy("log.app")
      .addGroupBy("log.action_type")
      .addGroupBy("log.provider")
      .orderBy("log.created_at::date", "DESC")
      .offset(offset)
      .limit(limit);

    const rows: AiUsageGroupRow[] = await groupQb.getRawMany();

    const countQb = baseQb.clone();
    const countResult = await countQb
      .select(
        "COUNT(DISTINCT (log.created_at::date || log.app || log.action_type || log.provider))",
        "cnt",
      )
      .getRawOne();
    const total = Number(countResult?.cnt ?? 0);

    return {
      data: rows,
      total,
      page,
      limit,
      summary: {
        totalTokens: Number(summaryResult?.totalTokens ?? 0),
        totalCalls: Number(summaryResult?.totalCalls ?? 0),
      },
    };
  }
}
