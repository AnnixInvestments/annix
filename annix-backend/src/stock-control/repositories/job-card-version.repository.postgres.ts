import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardVersion } from "../entities/job-card-version.entity";
import { JobCardVersionRepository } from "./job-card-version.repository";

@Injectable()
export class PostgresJobCardVersionRepository
  extends TypeOrmCrudRepository<JobCardVersion>
  implements JobCardVersionRepository
{
  constructor(@InjectRepository(JobCardVersion) repository: Repository<JobCardVersion>) {
    super(repository);
  }

  findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardVersion[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { versionNumber: "DESC" },
    });
  }

  findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardVersion | null> {
    return this.repository.findOne({
      where: { id, jobCardId, companyId },
    });
  }
}
