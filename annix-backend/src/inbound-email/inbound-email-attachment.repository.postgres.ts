import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  AttachmentExtractionStatus,
  InboundEmailAttachment,
} from "./entities/inbound-email-attachment.entity";
import { InboundEmailAttachmentRepository } from "./inbound-email-attachment.repository";

@Injectable()
export class PostgresInboundEmailAttachmentRepository
  extends TypeOrmCrudRepository<InboundEmailAttachment>
  implements InboundEmailAttachmentRepository
{
  constructor(
    @InjectRepository(InboundEmailAttachment) repository: Repository<InboundEmailAttachment>,
  ) {
    super(repository);
  }

  async updateFields(
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
  ): Promise<void> {
    await this.repository.update(id, data);
  }

  findSkippedClassifiedByApp(app: string): Promise<InboundEmailAttachment[]> {
    return this.repository
      .createQueryBuilder("att")
      .leftJoinAndSelect("att.inboundEmail", "email")
      .where("email.app = :app", { app })
      .andWhere("att.extraction_status = :status", {
        status: AttachmentExtractionStatus.SKIPPED,
      })
      .andWhere("att.document_type != :unknown", { unknown: "unknown" })
      .orderBy("att.id", "ASC")
      .getMany();
  }
}
