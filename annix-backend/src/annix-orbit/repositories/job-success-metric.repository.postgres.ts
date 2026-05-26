import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobSuccessMetric } from "../entities/job-success-metric.entity";
import { JobSuccessMetricRepository } from "./job-success-metric.repository";

@Injectable()
export class PostgresJobSuccessMetricRepository
  extends TypeOrmCrudRepository<JobSuccessMetric>
  implements JobSuccessMetricRepository
{
  constructor(@InjectRepository(JobSuccessMetric) repository: Repository<JobSuccessMetric>) {
    super(repository);
  }

  withTransaction(context: TransactionContext): PostgresJobSuccessMetricRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresJobSuccessMetricRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresJobSuccessMetricRepository(context.manager.getRepository(JobSuccessMetric));
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.repository.delete({ jobPostingId });
  }
}
