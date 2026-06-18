import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";

export abstract class AnnixSentinelComplianceRequirementRepository extends CrudRepository<AnnixSentinelComplianceRequirement> {
  abstract findByIds(ids: number[]): Promise<AnnixSentinelComplianceRequirement[]>;
}
