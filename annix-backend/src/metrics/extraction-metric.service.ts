import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExtractionMetric } from "./entities/extraction-metric.entity";

export interface ExtractionMetricRecord {
  category: string;
  operation?: string;
  durationMs: number;
  payloadSizeBytes?: number | null;
  succeeded?: boolean;
}

export interface ExtractionStats {
  category: string;
  operation: string;
  averageMs: number | null;
  sampleSize: number;
}

export type AggregatedUsageGroupBy = "category" | "operation" | "day";

export interface AggregatedUsageRow {
  category: string;
  operation: string;
  day: string | null;
  runs: number;
  failures: number;
  avgDurationMs: number;
  p95DurationMs: number;
  totalDurationMs: number;
  totalPayloadBytes: number;
  latestRunAt: string | null;
}

const ROLLING_WINDOW = 50;
const DEFAULT_USAGE_WINDOW_DAYS = 7;

@Injectable()
export class ExtractionMetricService {
  private readonly logger = new Logger(ExtractionMetricService.name);

  constructor(
    @InjectRepository(ExtractionMetric)
    private readonly repo: Repository<ExtractionMetric>,
  ) {}

  async record(input: ExtractionMetricRecord): Promise<void> {
    try {
      const metric = this.repo.create({
        category: input.category,
        operation: input.operation ?? "",
        durationMs: Math.max(0, Math.round(input.durationMs)),
        payloadSizeBytes: input.payloadSizeBytes ?? null,
        succeeded: input.succeeded ?? true,
      });
      await this.repo.save(metric);
    } catch (error) {
      this.logger.warn(
        `Failed to record extraction metric for ${input.category}/${input.operation ?? ""}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async stats(category: string, operation = ""): Promise<ExtractionStats> {
    const rows = await this.repo
      .createQueryBuilder("m")
      .select(["m.durationMs"])
      .where("m.category = :category", { category })
      .andWhere("m.operation = :operation", { operation })
      .andWhere("m.succeeded = true")
      .orderBy("m.created_at", "DESC")
      .limit(ROLLING_WINDOW)
      .getMany();

    if (rows.length === 0) {
      return { category, operation, averageMs: null, sampleSize: 0 };
    }

    const sorted = [...rows].map((r) => r.durationMs).sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.1);
    const trimmed = sorted.slice(trim, sorted.length - trim);
    const sample = trimmed.length > 0 ? trimmed : sorted;
    const total = sample.reduce((sum, ms) => sum + ms, 0);
    const averageMs = Math.round(total / sample.length);

    return { category, operation, averageMs, sampleSize: rows.length };
  }

  async aggregatedUsage(options?: {
    from?: Date;
    to?: Date;
    groupBy?: AggregatedUsageGroupBy;
    category?: string;
  }): Promise<AggregatedUsageRow[]> {
    const to = options?.to ?? new Date();
    const fromFallback = new Date(to.getTime() - DEFAULT_USAGE_WINDOW_DAYS * 86_400_000);
    const from = options?.from ?? fromFallback;
    const groupBy = options?.groupBy ?? "operation";

    const qb = this.repo
      .createQueryBuilder("m")
      .select("m.category", "category")
      .addSelect("COUNT(*)", "runs")
      .addSelect("SUM(CASE WHEN m.succeeded = false THEN 1 ELSE 0 END)", "failures")
      .addSelect("AVG(m.duration_ms)", "avg_duration_ms")
      .addSelect("percentile_cont(0.95) WITHIN GROUP (ORDER BY m.duration_ms)", "p95_duration_ms")
      .addSelect("SUM(m.duration_ms)", "total_duration_ms")
      .addSelect("COALESCE(SUM(m.payload_size_bytes), 0)", "total_payload_bytes")
      .addSelect("MAX(m.created_at)", "latest_run_at")
      .where("m.created_at >= :from", { from })
      .andWhere("m.created_at <= :to", { to });

    if (options?.category) {
      qb.andWhere("m.category = :category", { category: options.category });
    }

    if (groupBy === "category") {
      qb.addSelect("''", "operation").addSelect("NULL::text", "day").groupBy("m.category");
    } else if (groupBy === "operation") {
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
      };
    });
  }

  async time<T>(
    category: string,
    operation: string,
    fn: () => Promise<T>,
    bytesOption?: number | ((result: T) => number),
  ): Promise<T> {
    const start = Date.now();
    let succeeded = false;
    let result: T | undefined;
    try {
      result = await fn();
      succeeded = true;
      return result;
    } finally {
      const durationMs = Date.now() - start;
      let payloadSizeBytes: number | undefined;
      if (typeof bytesOption === "number") {
        payloadSizeBytes = bytesOption;
      } else if (typeof bytesOption === "function" && succeeded && result !== undefined) {
        try {
          payloadSizeBytes = bytesOption(result);
        } catch {
          // bytes-derivation must never break the wrapped call
        }
      }
      this.record({ category, operation, durationMs, payloadSizeBytes, succeeded });
    }
  }
}
