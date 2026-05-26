import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";
import { FeedbackAttachmentRepository } from "./feedback-attachment.repository";

@Injectable()
export class MongoFeedbackAttachmentRepository
  extends MongoCrudRepository<FeedbackAttachment>
  implements FeedbackAttachmentRepository
{
  constructor(@InjectModel("FeedbackAttachment") model: Model<FeedbackAttachment>) {
    super(model);
  }

  async findByFeedbackId(feedbackId: number): Promise<FeedbackAttachment[]> {
    const documents = await this.documents
      .find({ feedbackId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByFeedbackIdOrderedByCreated(feedbackId: number): Promise<FeedbackAttachment[]> {
    const documents = await this.documents
      .find({ feedbackId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
