import { Injectable, Logger } from "@nestjs/common";
import { ExtractionMetricRepository } from "./extraction-metric.repository";

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

  constructor(private readonly repo: ExtractionMetricRepository) {}

  async record(input: ExtractionMetricRecord): Promise<void> {
    try {
      await this.repo.create({
        category: input.category,
        operation: input.operation ?? "",
        durationMs: Math.max(0, Math.round(input.durationMs)),
        payloadSizeBytes: input.payloadSizeBytes ?? null,
        succeeded: input.succeeded ?? true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record extraction metric for ${input.category}/${input.operation ?? ""}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async stats(category: string, operation = ""): Promise<ExtractionStats> {
    const rows = await this.repo.statsForCategoryAndOperation(category, operation, ROLLING_WINDOW);

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

    return this.repo.aggregatedUsage({
      from,
      to,
      groupBy,
      category: options?.category,
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
