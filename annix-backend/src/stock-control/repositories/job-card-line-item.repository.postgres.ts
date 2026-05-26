import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { JobCardLineItemRepository } from "./job-card-line-item.repository";

@Injectable()
export class PostgresJobCardLineItemRepository
  extends TypeOrmCrudRepository<JobCardLineItem>
  implements JobCardLineItemRepository
{
  constructor(@InjectRepository(JobCardLineItem) repository: Repository<JobCardLineItem>) {
    super(repository);
  }

  findForJobCardAndCompany(jobCardId: number, companyId: number): Promise<JobCardLineItem[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
    });
  }

  findForJobCardOrderedBySort(jobCardId: number, companyId: number): Promise<JobCardLineItem[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { sortOrder: "ASC" },
    });
  }

  findForJobCard(jobCardId: number): Promise<JobCardLineItem[]> {
    return this.repository.find({ where: { jobCardId } });
  }

  findForJobCardOrderedBySortAnyCompany(jobCardId: number): Promise<JobCardLineItem[]> {
    return this.repository.find({
      where: { jobCardId },
      order: { sortOrder: "ASC" },
    });
  }

  findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardLineItem | null> {
    return this.repository.findOne({
      where: { id, jobCardId, companyId },
    });
  }

  findOneByIdAndJobCard(id: number, jobCardId: number): Promise<JobCardLineItem | null> {
    return this.repository.findOne({
      where: { id, jobCardId },
    });
  }

  countForJobCard(jobCardId: number): Promise<number> {
    return this.repository.count({ where: { jobCardId } });
  }

  async deleteForJobCard(jobCardId: number): Promise<void> {
    await this.repository.delete({ jobCardId });
  }

  saveMany(entities: JobCardLineItem[]): Promise<JobCardLineItem[]> {
    return this.repository.save(entities);
  }

  buildMany(rows: DeepPartial<JobCardLineItem>[]): JobCardLineItem[] {
    return this.repository.create(rows as TypeOrmDeepPartial<JobCardLineItem>[]);
  }
}
