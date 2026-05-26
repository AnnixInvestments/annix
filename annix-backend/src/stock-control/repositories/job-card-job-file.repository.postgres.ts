import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";
import { JobCardJobFileRepository } from "./job-card-job-file.repository";

@Injectable()
export class PostgresJobCardJobFileRepository
  extends TypeOrmCrudRepository<JobCardJobFile>
  implements JobCardJobFileRepository
{
  constructor(@InjectRepository(JobCardJobFile) repository: Repository<JobCardJobFile>) {
    super(repository);
  }

  findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardJobFile[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardJobFile | null> {
    return this.repository.findOne({
      where: { id, jobCardId, companyId },
    });
  }

  findById(id: number): Promise<JobCardJobFile | null> {
    return this.repository.findOne({ where: { id } });
  }

  async updateById(id: number, changes: DeepPartial<JobCardJobFile>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<JobCardJobFile>);
  }

  countImageFiles(jobCardId: number, companyId: number): Promise<number> {
    return this.repository.count({
      where: [
        { jobCardId, companyId, mimeType: "image/jpeg" },
        { jobCardId, companyId, mimeType: "image/png" },
        { jobCardId, companyId, mimeType: "image/jpg" },
      ],
    });
  }
}
