import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobSkill } from "../entities/job-skill.entity";
import { JobSkillRepository } from "./job-skill.repository";

@Injectable()
export class PostgresJobSkillRepository
  extends TypeOrmCrudRepository<JobSkill>
  implements JobSkillRepository
{
  constructor(@InjectRepository(JobSkill) repository: Repository<JobSkill>) {
    super(repository);
  }

  withTransaction(context: TransactionContext): PostgresJobSkillRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresJobSkillRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresJobSkillRepository(context.manager.getRepository(JobSkill));
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.repository.delete({ jobPostingId });
  }
}
