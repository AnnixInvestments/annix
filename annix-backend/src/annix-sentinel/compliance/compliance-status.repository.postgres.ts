import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelComplianceStatusRepository } from "./compliance-status.repository";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";

@Injectable()
export class PostgresAnnixSentinelComplianceStatusRepository
  extends TypeOrmCrudRepository<AnnixSentinelComplianceStatus>
  implements AnnixSentinelComplianceStatusRepository
{
  constructor(
    @InjectRepository(AnnixSentinelComplianceStatus)
    repository: Repository<AnnixSentinelComplianceStatus>,
  ) {
    super(repository);
  }

  findByCompanyIds(companyIds: number[]): Promise<AnnixSentinelComplianceStatus[]> {
    return this.repository.find({ where: { companyId: In(companyIds) } });
  }

  findWithDueDates(): Promise<AnnixSentinelComplianceStatus[]> {
    return this.repository.find({ where: { nextDueDate: Not(IsNull()) } });
  }
}
