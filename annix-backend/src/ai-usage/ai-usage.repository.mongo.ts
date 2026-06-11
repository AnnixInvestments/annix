import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model, PipelineStage } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  AiUsageDailyPoint,
  AiUsageDailySummary,
  AiUsageGroupRow,
  AiUsageLogRepository,
} from "./ai-usage.repository";
import { AiUsageLog } from "./entities/ai-usage-log.entity";

@Injectable()
export class MongoAiUsageLogRepository
  extends MongoCrudRepository<AiUsageLog>
  implements AiUsageLogRepository
{
  constructor(@InjectModel("AiUsageLog") model: Model<AiUsageLog>) {
    super(model);
  }

  async aggregateDailyUsageByModel(model: string, since: Date): Promise<AiUsageDailySummary> {
    const pipeline: PipelineStage[] = [
      { $match: { model, createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          tokens: { $sum: { $ifNull: ["$tokensUsed", 0] } },
        },
      },
    ];
    const results = await this.documents.aggregate(pipeline).exec();
    const row = results[0] as { calls: number; tokens: number } | undefined;
    return {
      calls: Number(row?.calls ?? 0),
      tokens: Number(row?.tokens ?? 0),
    };
  }

  async dailySeries(since: Date): Promise<AiUsageDailyPoint[]> {
    const pipeline: PipelineStage[] = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $ifNull: ["$createdAt", new Date()] },
              timezone: "Africa/Johannesburg",
            },
          },
          calls: { $sum: 1 },
          tokens: { $sum: { $ifNull: ["$tokensUsed", 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", calls: 1, tokens: 1 } },
    ];
    const results = await this.documents.aggregate(pipeline).exec();
    return (results as AiUsageDailyPoint[]).map((row) => ({
      date: row.date,
      calls: Number(row.calls),
      tokens: Number(row.tokens),
    }));
  }

  async queryGroupedUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
    offset: number,
    limit: number,
  ): Promise<AiUsageGroupRow[]> {
    const matchStage: Record<string, unknown> = {};
    if (app) matchStage.app = app;
    if (provider) matchStage.provider = provider;
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      matchStage.createdAt = dateFilter;
    }

    const pipeline: PipelineStage[] = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage } as PipelineStage] : []),
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$createdAt", new Date()] } },
            },
            app: "$app",
            actionType: "$actionType",
            provider: "$provider",
          },
          model: { $max: "$model" },
          totalCalls: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ["$tokensUsed", 0] } },
          totalPages: { $sum: { $ifNull: ["$pageCount", 0] } },
          totalTimeMs: { $sum: { $ifNull: ["$processingTimeMs", 0] } },
        },
      },
      { $sort: { "_id.date": -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          app: "$_id.app",
          actionType: "$_id.actionType",
          provider: "$_id.provider",
          model: 1,
          totalCalls: 1,
          totalTokens: 1,
          totalPages: 1,
          totalTimeMs: 1,
        },
      },
    ];

    const results = await this.documents.aggregate(pipeline).exec();
    return results as AiUsageGroupRow[];
  }

  async countDistinctGroups(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<number> {
    const matchStage: Record<string, unknown> = {};
    if (app) matchStage.app = app;
    if (provider) matchStage.provider = provider;
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      matchStage.createdAt = dateFilter;
    }

    const pipeline: PipelineStage[] = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage } as PipelineStage] : []),
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$createdAt", new Date()] } },
            },
            app: "$app",
            actionType: "$actionType",
            provider: "$provider",
          },
        },
      },
      { $count: "total" },
    ];

    const results = await this.documents.aggregate(pipeline).exec();
    const row = results[0] as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  async sumUsage(
    app: string | null,
    provider: string | null,
    from: string | null,
    to: string | null,
  ): Promise<{ totalTokens: number; totalCalls: number }> {
    const matchStage: Record<string, unknown> = {};
    if (app) matchStage.app = app;
    if (provider) matchStage.provider = provider;
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      matchStage.createdAt = dateFilter;
    }

    const pipeline: PipelineStage[] = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage } as PipelineStage] : []),
      {
        $group: {
          _id: null,
          totalTokens: { $sum: { $ifNull: ["$tokensUsed", 0] } },
          totalCalls: { $sum: 1 },
        },
      },
    ];

    const results = await this.documents.aggregate(pipeline).exec();
    const row = results[0] as { totalTokens: number; totalCalls: number } | undefined;
    return {
      totalTokens: Number(row?.totalTokens ?? 0),
      totalCalls: Number(row?.totalCalls ?? 0),
    };
  }
}
