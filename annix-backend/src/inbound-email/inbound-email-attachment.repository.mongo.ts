import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  AttachmentExtractionStatus,
  InboundEmailAttachment,
} from "./entities/inbound-email-attachment.entity";
import { InboundEmailAttachmentRepository } from "./inbound-email-attachment.repository";

@Injectable()
export class MongoInboundEmailAttachmentRepository
  extends MongoCrudRepository<InboundEmailAttachment>
  implements InboundEmailAttachmentRepository
{
  constructor(@InjectModel("InboundEmailAttachment") model: Model<InboundEmailAttachment>) {
    super(model);
  }

  private get emailModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("InboundEmail");
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
    await this.documents.findByIdAndUpdate(id, data).exec();
  }

  async findSkippedClassifiedByApp(app: string): Promise<InboundEmailAttachment[]> {
    const emails = await this.emailModel.find({ app }).select("_id").lean().exec();
    const emailIds = emails.map((email) => email._id);
    const documents = await this.documents
      .find({
        inboundEmailId: { $in: emailIds },
        extractionStatus: AttachmentExtractionStatus.SKIPPED,
        documentType: { $ne: "unknown" },
      })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
