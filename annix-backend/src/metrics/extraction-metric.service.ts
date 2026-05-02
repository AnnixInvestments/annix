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

const ROLLING_WINDOW = 50;

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

  async time<T>(
    category: string,
    operation: string,
    fn: () => Promise<T>,
    payloadSizeBytes?: number,
  ): Promise<T> {
    const start = Date.now();
    let succeeded = false;
    try {
      const result = await fn();
      succeeded = true;
      return result;
    } finally {
      const durationMs = Date.now() - start;
      this.record({ category, operation, durationMs, payloadSizeBytes, succeeded });
    }
  }
}
