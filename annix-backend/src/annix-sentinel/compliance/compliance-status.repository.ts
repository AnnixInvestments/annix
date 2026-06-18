import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";

export abstract class AnnixSentinelComplianceStatusRepository extends CrudRepository<AnnixSentinelComplianceStatus> {
  abstract findByCompanyIds(companyIds: number[]): Promise<AnnixSentinelComplianceStatus[]>;
  abstract findWithDueDates(): Promise<AnnixSentinelComplianceStatus[]>;
}
