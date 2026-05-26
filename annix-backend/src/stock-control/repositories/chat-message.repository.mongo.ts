import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatMessageRepository } from "./chat-message.repository";

@Injectable()
export class MongoChatMessageRepository
  extends MongoCrudRepository<ChatMessage>
  implements ChatMessageRepository
{
  constructor(@InjectModel("ChatMessage") model: Model<ChatMessage>) {
    super(model);
  }

  async findMessages(
    companyId: number,
    afterId: number | null,
    conversationId: number | null,
    limit: number,
  ): Promise<ChatMessage[]> {
    const filter: Record<string, unknown> = { companyId };
    if (conversationId !== null) {
      filter.conversationId = conversationId;
    } else {
      filter.conversationId = null;
    }

    if (afterId !== null) {
      const cursorMsg = await this.documents.findById(afterId).lean().exec();
      if (cursorMsg) {
        filter.createdAt = { $gt: cursorMsg.createdAt };
      }
    }

    const docs = await this.documents
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countUnreadForConversation(
    companyId: number,
    conversationId: number,
    userId: number,
    lastReadAt: Date | null,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      conversationId,
      companyId,
      senderId: { $ne: userId },
    };
    if (lastReadAt !== null) {
      filter.createdAt = { $gt: lastReadAt };
    }
    return this.documents.countDocuments(filter).exec();
  }

  async countGeneralUnread(companyId: number, lastReadMessageId: number | null): Promise<number> {
    const filter: Record<string, unknown> = { companyId, conversationId: null };

    if (lastReadMessageId !== null) {
      const cursorMsg = await this.documents.findById(lastReadMessageId).lean().exec();
      if (cursorMsg) {
        filter.createdAt = { $gt: cursorMsg.createdAt };
      }
    }

    return this.documents.countDocuments(filter).exec();
  }
}
