import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";

export abstract class AnnixSentinelCompanyDetailsRepository extends CrudRepository<AnnixSentinelCompanyDetails> {
  abstract findOneByCompanyId(companyId: number): Promise<AnnixSentinelCompanyDetails | null>;
  abstract countCancelledCreatedBefore(cutoff: Date): Promise<number>;
}
