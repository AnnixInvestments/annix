import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import { ExtractionMetricRepository } from "./extraction-metric.repository";
import type { AggregatedUsageGroupBy, AggregatedUsageRow } from "./extraction-metric.service";

@Injectable()
export class PostgresExtractionMetricRepository
  extends TypeOrmCrudRepository<ExtractionMetric>
  implements ExtractionMetricRepository
{
  constructor(@InjectRepository(ExtractionMetric) repository: Repository<ExtractionMetric>) {
    super(repository);
  }

  statsForCategoryAndOperation(
    category: string,
    operation: string,
    rollingWindow: number,
  ): Promise<ExtractionMetric[]> {
    return this.repository
      .createQueryBuilder("m")
      .select(["m.durationMs"])
      .where("m.category = :category", { category })
      .andWhere("m.operation = :operation", { operation })
      .andWhere("m.succeeded = true")
      .orderBy("m.created_at", "DESC")
      .limit(rollingWindow)
      .getMany();
  }

  async aggregatedUsage(options: {
    from: Date;
    to: Date;
    groupBy: AggregatedUsageGroupBy;
    category?: string;
  }): Promise<AggregatedUsageRow[]> {
    const qb = this.repository
      .createQueryBuilder("m")
      .select("m.category", "category")
      .addSelect("COUNT(*)", "runs")
      .addSelect("SUM(CASE WHEN m.succeeded = false THEN 1 ELSE 0 END)", "failures")
      .addSelect("AVG(m.duration_ms)", "avg_duration_ms")
      .addSelect("percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)", "p95_duration_ms")
      .addSelect("SUM(m.duration_ms)", "total_duration_ms")
      .addSelect("COALESCE(SUM(m.payload_size_bytes), 0)", "total_payload_bytes")
      .addSelect("MAX(m.created_at)", "latest_run_at")
      .where("m.created_at >= :from", { from: options.from })
      .andWhere("m.created_at <= :to", { to: options.to });

    if (options.category) {
      qb.andWhere("m.category = :category", { category: options.category });
    }

    if (options.groupBy === "category") {
      qb.addSelect("''", "operation").addSelect("NULL::text", "day").groupBy("m.category");
    } else if (options.groupBy === "operation") {
      qb.addSelect("m.operation", "operation")
        .addSelect("NULL::text", "day")
        .groupBy("m.category")
        .addGroupBy("m.operation");
    } else {
      qb.addSelect("m.operation", "operation")
        .addSelect("to_char(date_trunc('day', m.created_at), 'YYYY-MM-DD')", "day")
        .groupBy("m.category")
        .addGroupBy("m.operation")
        .addGroupBy("day");
    }

    qb.orderBy("total_payload_bytes", "DESC").addOrderBy("total_duration_ms", "DESC");

    const raw = await qb.getRawMany<{
      category: string;
      operation: string;
      day: string | null;
      runs: string;
      failures: string;
      avg_duration_ms: string | null;
      p95_duration_ms: string | null;
      total_duration_ms: string | null;
      total_payload_bytes: string | null;
      latest_run_at: Date | string | null;
    }>();

    return raw.map((row) => {
      const latestRunRaw = row.latest_run_at;
      const latestRunAt =
        latestRunRaw === null
          ? null
          : latestRunRaw instanceof Date
            ? latestRunRaw.toISOString()
            : new Date(latestRunRaw).toISOString();
      return {
        category: row.category,
        operation: row.operation ?? "",
        day: row.day,
        runs: Number(row.runs ?? 0),
        failures: Number(row.failures ?? 0),
        avgDurationMs: Math.round(Number(row.avg_duration_ms ?? 0)),
        p95DurationMs: Math.round(Number(row.p95_duration_ms ?? 0)),
        totalDurationMs: Math.round(Number(row.total_duration_ms ?? 0)),
        totalPayloadBytes: Number(row.total_payload_bytes ?? 0),
        latestRunAt,
        lastFailureReason: null,
      };
    });
  }
}
