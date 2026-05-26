import { CrudRepository } from "../lib/persistence/crud-repository";
import { RfqDocument } from "./entities/rfq-document.entity";

export abstract class RfqDocumentRepository extends CrudRepository<RfqDocument> {
  abstract findByRfqIdWithUploadedBy(rfqId: number): Promise<RfqDocument[]>;
  abstract findByIdWithRfqAndUploadedBy(documentId: number): Promise<RfqDocument | null>;
  abstract findByIdWithRfqCreatedBy(documentId: number): Promise<RfqDocument | null>;
}
