import { CrudRepository } from "../lib/persistence/crud-repository";
import { ExtractionMetric } from "./entities/extraction-metric.entity";
import type { AggregatedUsageGroupBy, AggregatedUsageRow } from "./extraction-metric.service";

export abstract class ExtractionMetricRepository extends CrudRepository<ExtractionMetric> {
  abstract statsForCategoryAndOperation(
    category: string,
    operation: string,
    rollingWindow: number,
  ): Promise<ExtractionMetric[]>;

  abstract aggregatedUsage(options: {
    from: Date;
    to: Date;
    groupBy: AggregatedUsageGroupBy;
    category?: string;
  }): Promise<AggregatedUsageRow[]>;
}
