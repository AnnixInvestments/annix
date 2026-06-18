import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelGovernmentDocument } from "./entities/government-document.entity";

export abstract class AnnixSentinelGovernmentDocumentRepository extends CrudRepository<AnnixSentinelGovernmentDocument> {
  abstract findAllOrderedByCategory(): Promise<AnnixSentinelGovernmentDocument[]>;
}
