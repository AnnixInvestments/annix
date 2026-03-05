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

export interface AiUsageListResponse {
  data: AiUsageLog[];
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
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder("log");

    if (query.app) {
      qb.andWhere("log.app = :app", { app: query.app });
    }
    if (query.provider) {
      qb.andWhere("log.provider = :provider", { provider: query.provider });
    }
    if (query.from) {
      qb.andWhere("log.createdAt >= :from", { from: query.from });
    }
    if (query.to) {
      qb.andWhere("log.createdAt <= :to", { to: query.to });
    }

    const summaryQb = qb.clone();

    qb.orderBy("log.createdAt", "DESC").skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const summaryResult = await summaryQb
      .select("COALESCE(SUM(log.tokensUsed), 0)", "totalTokens")
      .addSelect("COUNT(*)", "totalCalls")
      .getRawOne();

    return {
      data,
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
