import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { AiUsageDailySummary, AiUsageGroupRow, AiUsageLogRepository } from "./ai-usage.repository";
import { AiUsageLog } from "./entities/ai-usage-log.entity";

@Injectable()
export class PostgresAiUsageLogRepository
  extends TypeOrmCrudRepository<AiUsageLog>
  implements AiUsageLogRepository
{
  constructor(@InjectRepository(AiUsageLog) repository: Repository<AiUsageLog>) {
    super(repository);
  }

  async aggregateDailyUsageByModel(model: string, since: Date): Promise<AiUsageDailySummary> {
    const row = await this.repository
      .createQueryBuilder("log")
      .select("COUNT(*)::int", "calls")
      .addSelect("COALESCE(SUM(log.tokens_used), 0)::bigint", "tokens")
      .where("log.model = :model", { model })
      .andWhere("log.createdAt >= :since", { since })
      .getRawOne<{ calls: number; tokens: string | number }>();
    return {
      calls: Number(row?.calls ?? 0),
      tokens: Number(row?.tokens ?? 0),
    };
  }

  async queryGroupedUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
    offset: number,
    limit: number,
  ): Promise<AiUsageGroupRow[]> {
    const qb = this.repository.createQueryBuilder("log");
    if (app) qb.andWhere("log.app = :app", { app });
    if (provider) qb.andWhere("log.provider = :provider", { provider });
    if (from) qb.andWhere("log.createdAt >= :from", { from });
    if (to) qb.andWhere("log.createdAt <= :to", { to });
    qb.select("log.created_at::date", "date")
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
    return qb.getRawMany<AiUsageGroupRow>();
  }

  async countDistinctGroups(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<number> {
    const qb = this.repository.createQueryBuilder("log");
    if (app) qb.andWhere("log.app = :app", { app });
    if (provider) qb.andWhere("log.provider = :provider", { provider });
    if (from) qb.andWhere("log.createdAt >= :from", { from });
    if (to) qb.andWhere("log.createdAt <= :to", { to });
    const result = await qb
      .select(
        "COUNT(DISTINCT (log.created_at::date || log.app || log.action_type || log.provider))",
        "cnt",
      )
      .getRawOne<{ cnt: string | number }>();
    return Number(result?.cnt ?? 0);
  }

  async sumUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<{ totalTokens: number; totalCalls: number }> {
    const qb = this.repository.createQueryBuilder("log");
    if (app) qb.andWhere("log.app = :app", { app });
    if (provider) qb.andWhere("log.provider = :provider", { provider });
    if (from) qb.andWhere("log.createdAt >= :from", { from });
    if (to) qb.andWhere("log.createdAt <= :to", { to });
    const result = await qb
      .select("COALESCE(SUM(log.tokensUsed), 0)", "totalTokens")
      .addSelect("COUNT(*)", "totalCalls")
      .getRawOne<{ totalTokens: string | number; totalCalls: string | number }>();
    return {
      totalTokens: Number(result?.totalTokens ?? 0),
      totalCalls: Number(result?.totalCalls ?? 0),
    };
  }
}
