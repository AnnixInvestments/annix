import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatMessageRepository } from "./chat-message.repository";

@Injectable()
export class MongoChatMessageRepository
  extends MongoTenantScopedRepository<ChatMessage>
  implements ChatMessageRepository
{
  constructor(
    @InjectModel("ChatMessage") model: Model<ChatMessage>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoChatMessageRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoChatMessageRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoChatMessageRepository {
    return new MongoChatMessageRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: ChatMessage): Promise<ChatMessage> {
    if (entity.companyId !== companyId) {
      throw new Error("Chat message does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: ChatMessage): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Chat message does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneForCompany(id: number, companyId: number): Promise<ChatMessage | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
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
