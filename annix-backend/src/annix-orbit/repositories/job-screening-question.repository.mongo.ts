import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobScreeningQuestion } from "../entities/job-screening-question.entity";
import { JobScreeningQuestionRepository } from "./job-screening-question.repository";

@Injectable()
export class MongoJobScreeningQuestionRepository
  extends MongoCrudRepository<JobScreeningQuestion>
  implements JobScreeningQuestionRepository
{
  constructor(
    @InjectModel("JobScreeningQuestion") model: Model<JobScreeningQuestion>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobScreeningQuestionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobScreeningQuestionRepository requires a MongoTransactionContext");
    }
    return new MongoJobScreeningQuestionRepository(this.model, context.session);
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.documents.deleteMany({ jobPostingId }).session(this.session).exec();
  }
}
