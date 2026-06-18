import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";

@Injectable()
export class PostgresAnnixSentinelComplianceRequirementRepository
  extends TypeOrmCrudRepository<AnnixSentinelComplianceRequirement>
  implements AnnixSentinelComplianceRequirementRepository
{
  constructor(
    @InjectRepository(AnnixSentinelComplianceRequirement)
    repository: Repository<AnnixSentinelComplianceRequirement>,
  ) {
    super(repository);
  }

  findByIds(ids: number[]): Promise<AnnixSentinelComplianceRequirement[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }
}
