import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";
import { JobCardImportMappingRepository } from "./job-card-import-mapping.repository";

@Injectable()
export class PostgresJobCardImportMappingRepository
  extends TypeOrmCrudRepository<JobCardImportMapping>
  implements JobCardImportMappingRepository
{
  constructor(
    @InjectRepository(JobCardImportMapping)
    repository: Repository<JobCardImportMapping>,
  ) {
    super(repository);
  }

  findForCompany(companyId: number): Promise<JobCardImportMapping | null> {
    return this.repository.findOne({ where: { companyId } });
  }
}
