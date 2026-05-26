import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import { JobCardBackgroundCompletionRepository } from "./job-card-background-completion.repository";

@Injectable()
export class PostgresJobCardBackgroundCompletionRepository
  extends TypeOrmCrudRepository<JobCardBackgroundCompletion>
  implements JobCardBackgroundCompletionRepository
{
  constructor(
    @InjectRepository(JobCardBackgroundCompletion)
    repository: Repository<JobCardBackgroundCompletion>,
  ) {
    super(repository);
  }

  findOneByJobCardAndStep(
    jobCardId: number,
    stepKey: string,
  ): Promise<JobCardBackgroundCompletion | null> {
    return this.repository.findOne({
      where: { jobCardId, stepKey },
    });
  }

  findForJobCardAndCompany(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardBackgroundCompletion[]> {
    return this.repository.find({ where: { jobCardId, companyId } });
  }

  findForJobCard(jobCardId: number): Promise<JobCardBackgroundCompletion[]> {
    return this.repository.find({ where: { jobCardId } });
  }

  findForCompany(companyId: number): Promise<JobCardBackgroundCompletion[]> {
    return this.repository.find({ where: { companyId } });
  }

  findForCompanyAndJobCardIds(
    companyId: number,
    jobCardIds: number[],
  ): Promise<JobCardBackgroundCompletion[]> {
    return this.repository.find({
      where: { companyId, jobCardId: In(jobCardIds) },
      select: ["jobCardId", "stepKey"],
    });
  }

  buildMany(rows: DeepPartial<JobCardBackgroundCompletion>[]): JobCardBackgroundCompletion[] {
    return this.repository.create(rows as TypeOrmDeepPartial<JobCardBackgroundCompletion>[]);
  }

  saveMany(entities: JobCardBackgroundCompletion[]): Promise<JobCardBackgroundCompletion[]> {
    return this.repository.save(entities);
  }

  async removeMany(entities: JobCardBackgroundCompletion[]): Promise<void> {
    await this.repository.remove(entities);
  }

  async deleteByJobCardCompanyStep(
    jobCardId: number,
    companyId: number,
    stepKey: string,
  ): Promise<void> {
    await this.repository.delete({ jobCardId, companyId, stepKey });
  }
}
