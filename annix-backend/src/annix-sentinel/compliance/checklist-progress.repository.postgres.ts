import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";

@Injectable()
export class PostgresAnnixSentinelChecklistProgressRepository
  extends TypeOrmCrudRepository<AnnixSentinelChecklistProgress>
  implements AnnixSentinelChecklistProgressRepository
{
  constructor(
    @InjectRepository(AnnixSentinelChecklistProgress)
    repository: Repository<AnnixSentinelChecklistProgress>,
  ) {
    super(repository);
  }

  findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelChecklistProgress[]> {
    return this.repository.find({
      where: { companyId, requirementId: In(requirementIds) },
    });
  }
}
