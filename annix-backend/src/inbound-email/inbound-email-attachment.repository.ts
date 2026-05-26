import { CrudRepository } from "../lib/persistence/crud-repository";
import { InboundEmailAttachment } from "./entities/inbound-email-attachment.entity";

export abstract class InboundEmailAttachmentRepository extends CrudRepository<InboundEmailAttachment> {
  abstract updateFields(
    id: number,
    data: Partial<
      Pick<
        InboundEmailAttachment,
        | "linkedEntityType"
        | "linkedEntityId"
        | "extractionStatus"
        | "errorMessage"
        | "documentType"
        | "classificationConfidence"
        | "classificationSource"
        | "extractedData"
        | "s3Path"
      >
    >,
  ): Promise<void>;

  abstract findSkippedClassifiedByApp(app: string): Promise<InboundEmailAttachment[]>;
}
