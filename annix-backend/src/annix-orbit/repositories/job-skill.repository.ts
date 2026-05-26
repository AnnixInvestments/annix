import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobSkill } from "../entities/job-skill.entity";

export abstract class JobSkillRepository extends CrudRepository<JobSkill> {
  abstract withTransaction(context: TransactionContext): JobSkillRepository;
  abstract deleteByJobPosting(jobPostingId: number): Promise<void>;
}
