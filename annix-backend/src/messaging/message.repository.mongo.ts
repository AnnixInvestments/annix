import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Message } from "./entities/message.entity";
import { MessagePage, MessagePagination, MessageRepository } from "./message.repository";

@Injectable()
export class MongoMessageRepository
  extends MongoCrudRepository<Message>
  implements MessageRepository
{
  constructor(@InjectModel("Message") model: Model<Message>) {
    super(model);
  }

  async findPageForConversation(
    conversationId: number,
    pagination: MessagePagination,
  ): Promise<MessagePage> {
    const limit = pagination.limit || 50;
    const query: Record<string, unknown> = { conversationId, isDeleted: false };

    if (pagination.beforeId) {
      query["_id"] = { $lt: pagination.beforeId };
    }

    if (pagination.afterId) {
      query["_id"] = { $gt: pagination.afterId };
    }

    const rawDocs = await this.documents
      .find(query)
      .sort({ sentAt: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = rawDocs.length > limit;
    const messages = this.toDomainList(hasMore ? rawDocs.slice(0, limit) : rawDocs);
    return { messages, hasMore };
  }

  async findPreviousFromOtherSender(
    conversationId: number,
    senderId: number,
  ): Promise<Message | null> {
    const document = await this.documents
      .findOne({ conversationId, senderId: { $ne: senderId } })
      .sort({ sentAt: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async countUnreadForParticipant(
    conversationId: number,
    userId: number,
    afterDate: Date | null,
  ): Promise<number> {
    const query: Record<string, unknown> = {
      conversationId,
      senderId: { $ne: userId },
      isDeleted: false,
    };
    if (afterDate) {
      query["sentAt"] = { $lt: afterDate };
    }
    return this.documents.countDocuments(query).exec();
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.documents.deleteMany({ conversationId: { $in: conversationIds } }).exec();
  }
}
