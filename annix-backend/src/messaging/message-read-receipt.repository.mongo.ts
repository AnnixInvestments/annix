import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MessageReadReceipt } from "./entities/message-read-receipt.entity";
import { MessageReadReceiptRepository } from "./message-read-receipt.repository";

@Injectable()
export class MongoMessageReadReceiptRepository
  extends MongoCrudRepository<MessageReadReceipt>
  implements MessageReadReceiptRepository
{
  constructor(@InjectModel("MessageReadReceipt") model: Model<MessageReadReceipt>) {
    super(model);
  }

  async findByMessageIdsAndUser(
    messageIds: number[],
    userId: number,
  ): Promise<MessageReadReceipt[]> {
    const documents = await this.documents
      .find({ messageId: { $in: messageIds }, userId })
      .lean()
      .exec();
    return this.toDomainList(documents);
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
