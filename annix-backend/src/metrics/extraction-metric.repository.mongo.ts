import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model, PipelineStage } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import { ExtractionMetricRepository } from "./extraction-metric.repository";
import type { AggregatedUsageGroupBy, AggregatedUsageRow } from "./extraction-metric.service";

@Injectable()
export class MongoExtractionMetricRepository
  extends MongoCrudRepository<ExtractionMetric>
  implements ExtractionMetricRepository
{
  constructor(@InjectModel("ExtractionMetric") model: Model<ExtractionMetric>) {
    super(model);
  }

  async statsForCategoryAndOperation(
    category: string,
    operation: string,
    rollingWindow: number,
  ): Promise<ExtractionMetric[]> {
    const documents = await this.documents
      .find({ category, operation, succeeded: true })
      .sort({ createdAt: -1 })
      .limit(rollingWindow)
      .select({ durationMs: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async aggregatedUsage(options: {
    from: Date;
    to: Date;
    groupBy: AggregatedUsageGroupBy;
    category?: string;
  }): Promise<AggregatedUsageRow[]> {
    const matchStage: Record<string, unknown> = {
      createdAt: { $gte: options.from, $lte: options.to },
    };
    if (options.category) {
      matchStage.category = options.category;
    }

    const groupId: Record<string, unknown> = { category: "$category" };
    if (options.groupBy === "operation" || options.groupBy === "day") {
      groupId.operation = "$operation";
    }
    if (options.groupBy === "day") {
      groupId.day = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          runs: { $sum: 1 },
          failures: {
            $sum: { $cond: [{ $eq: ["$succeeded", false] }, 1, 0] },
          },
          avgDurationMs: { $avg: "$durationMs" },
          totalDurationMs: { $sum: "$durationMs" },
          totalPayloadBytes: { $sum: { $ifNull: ["$payloadSizeBytes", 0] } },
          latestRunAt: { $max: "$createdAt" },
          allDurations: { $push: "$durationMs" },
        },
      },
      {
        $sort: { totalPayloadBytes: -1, totalDurationMs: -1 },
      },
    ];

    const raw = await this.documents.aggregate(pipeline as PipelineStage[]).exec();

    return raw.map((row) => {
      const sorted = [...(row.allDurations as number[])].sort((a, b) => a - b);
      const p95Index = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1);
      const p95DurationMs = sorted.length > 0 ? sorted[p95Index] : 0;

      return {
        category: (row._id as Record<string, unknown>).category as string,
        operation:
          options.groupBy === "category"
            ? ""
            : (((row._id as Record<string, unknown>).operation as string) ?? ""),
        day:
          options.groupBy === "day"
            ? (((row._id as Record<string, unknown>).day as string) ?? null)
            : null,
        runs: Number(row.runs ?? 0),
        failures: Number(row.failures ?? 0),
        avgDurationMs: Math.round(Number(row.avgDurationMs ?? 0)),
        p95DurationMs: Math.round(p95DurationMs),
        totalDurationMs: Math.round(Number(row.totalDurationMs ?? 0)),
        totalPayloadBytes: Number(row.totalPayloadBytes ?? 0),
        latestRunAt: row.latestRunAt instanceof Date ? row.latestRunAt.toISOString() : null,
      };
    });
  }
}
