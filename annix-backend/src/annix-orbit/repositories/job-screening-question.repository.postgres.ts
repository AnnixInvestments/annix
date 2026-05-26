import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobScreeningQuestion } from "../entities/job-screening-question.entity";
import { JobScreeningQuestionRepository } from "./job-screening-question.repository";

@Injectable()
export class PostgresJobScreeningQuestionRepository
  extends TypeOrmCrudRepository<JobScreeningQuestion>
  implements JobScreeningQuestionRepository
{
  constructor(
    @InjectRepository(JobScreeningQuestion) repository: Repository<JobScreeningQuestion>,
  ) {
    super(repository);
  }

  withTransaction(context: TransactionContext): PostgresJobScreeningQuestionRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresJobScreeningQuestionRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresJobScreeningQuestionRepository(
      context.manager.getRepository(JobScreeningQuestion),
    );
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.repository.delete({ jobPostingId });
  }
}
