import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";
import { JobCardImportJobRepository } from "./job-card-import-job.repository";

@Injectable()
export class PostgresJobCardImportJobRepository
  extends TypeOrmCrudRepository<JobCardImportJob>
  implements JobCardImportJobRepository
{
  constructor(
    @InjectRepository(JobCardImportJob)
    repository: Repository<JobCardImportJob>,
  ) {
    super(repository);
  }

  findActiveForUser(
    companyId: number,
    createdByUserId: number | null,
  ): Promise<JobCardImportJob[]> {
    return this.repository.find({
      where: {
        companyId,
        createdByUserId: createdByUserId === null ? IsNull() : createdByUserId,
        acknowledged: false,
        status: In(["processing", "completed", "failed"]),
      },
      order: { id: "DESC" },
      take: 10,
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<JobCardImportJob | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  async markStaleProcessingFailed(error: string): Promise<number> {
    const result = await this.repository.update(
      { status: "processing" },
      { status: "failed", error },
    );
    return result.affected ?? 0;
  }
}
