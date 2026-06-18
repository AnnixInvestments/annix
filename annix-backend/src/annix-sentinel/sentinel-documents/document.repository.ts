import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelDocument } from "./entities/document.entity";

export abstract class AnnixSentinelDocumentRepository extends CrudRepository<AnnixSentinelDocument> {
  abstract findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelDocument[]>;
  abstract findByCompanyAndRequirementNewestFirst(
    companyId: number,
    requirementId: number,
  ): Promise<AnnixSentinelDocument[]>;
  abstract findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelDocument | null>;
  abstract findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelDocument[]>;
  abstract findWithExpiryDate(): Promise<AnnixSentinelDocument[]>;
}
