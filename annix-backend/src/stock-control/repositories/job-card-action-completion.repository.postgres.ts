import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";
import { JobCardActionCompletionRepository } from "./job-card-action-completion.repository";

@Injectable()
export class PostgresJobCardActionCompletionRepository
  extends TypeOrmCrudRepository<JobCardActionCompletion>
  implements JobCardActionCompletionRepository
{
  constructor(
    @InjectRepository(JobCardActionCompletion)
    repository: Repository<JobCardActionCompletion>,
  ) {
    super(repository);
  }

  findOneForStepAction(
    jobCardId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null> {
    return this.repository.findOne({
      where: { jobCardId, stepKey, actionType },
    });
  }

  findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardActionCompletion[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { completedAt: "ASC" },
    });
  }

  findOneForJobCardStepAction(
    jobCardId: number,
    companyId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null> {
    return this.repository.findOne({
      where: { jobCardId, companyId, stepKey, actionType },
    });
  }
}
