import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobScreeningQuestion } from "../entities/job-screening-question.entity";

export abstract class JobScreeningQuestionRepository extends CrudRepository<JobScreeningQuestion> {
  abstract withTransaction(context: TransactionContext): JobScreeningQuestionRepository;
  abstract deleteByJobPosting(jobPostingId: number): Promise<void>;
}
