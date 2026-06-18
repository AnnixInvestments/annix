import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";

export abstract class AnnixSentinelChecklistProgressRepository extends CrudRepository<AnnixSentinelChecklistProgress> {
  abstract findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelChecklistProgress[]>;
}
