import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobSuccessMetric } from "../entities/job-success-metric.entity";
import { JobSuccessMetricRepository } from "./job-success-metric.repository";

@Injectable()
export class MongoJobSuccessMetricRepository
  extends MongoCrudRepository<JobSuccessMetric>
  implements JobSuccessMetricRepository
{
  constructor(
    @InjectModel("JobSuccessMetric", ORBIT_CONNECTION) model: Model<JobSuccessMetric>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobSuccessMetricRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobSuccessMetricRepository requires a MongoTransactionContext");
    }
    return new MongoJobSuccessMetricRepository(this.model, context.session);
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.documents.deleteMany({ jobPostingId }).session(this.session).exec();
  }
}
