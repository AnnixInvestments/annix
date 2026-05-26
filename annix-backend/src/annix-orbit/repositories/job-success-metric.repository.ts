import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobSuccessMetric } from "../entities/job-success-metric.entity";

export abstract class JobSuccessMetricRepository extends CrudRepository<JobSuccessMetric> {
  abstract withTransaction(context: TransactionContext): JobSuccessMetricRepository;
  abstract deleteByJobPosting(jobPostingId: number): Promise<void>;
}
