import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobSkill } from "../entities/job-skill.entity";
import { JobSkillRepository } from "./job-skill.repository";

@Injectable()
export class MongoJobSkillRepository
  extends MongoCrudRepository<JobSkill>
  implements JobSkillRepository
{
  constructor(
    @InjectModel("JobSkill") model: Model<JobSkill>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobSkillRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobSkillRepository requires a MongoTransactionContext");
    }
    return new MongoJobSkillRepository(this.model, context.session);
  }

  async deleteByJobPosting(jobPostingId: number): Promise<void> {
    await this.documents.deleteMany({ jobPostingId }).session(this.session).exec();
  }
}
