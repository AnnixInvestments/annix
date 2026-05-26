import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MessageAttachment } from "./entities/message-attachment.entity";
import { MessageAttachmentRepository } from "./message-attachment.repository";

@Injectable()
export class MongoMessageAttachmentRepository
  extends MongoCrudRepository<MessageAttachment>
  implements MessageAttachmentRepository
{
  constructor(@InjectModel("MessageAttachment") model: Model<MessageAttachment>) {
    super(model);
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    const messages = await this.documents
      .find({ conversationId: { $in: conversationIds } }, { _id: 1 })
      .lean()
      .exec();
    const messageIds = messages.map((m) => (m as Record<string, unknown>)["_id"]);
    if (messageIds.length > 0) {
      await this.documents.deleteMany({ messageId: { $in: messageIds } }).exec();
    }
  }
}
