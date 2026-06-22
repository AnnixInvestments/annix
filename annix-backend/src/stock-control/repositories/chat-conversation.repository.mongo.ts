import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ChatConversation } from "../entities/chat-conversation.entity";
import { ChatConversationRepository } from "./chat-conversation.repository";

@Injectable()
export class MongoChatConversationRepository
  extends MongoTenantScopedRepository<ChatConversation>
  implements ChatConversationRepository
{
  constructor(
    @InjectModel("ChatConversation") model: Model<ChatConversation>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoChatConversationRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoChatConversationRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoChatConversationRepository {
    return new MongoChatConversationRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: ChatConversation): Promise<ChatConversation> {
    if (entity.companyId !== companyId) {
      throw new Error("Chat conversation does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: ChatConversation): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Chat conversation does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  private get participantModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("ChatConversationParticipant");
  }

  async touchLastMessageAt(conversationId: number, lastMessageAt: Date): Promise<void> {
    await this.documents.findByIdAndUpdate(conversationId, { lastMessageAt }).exec();
  }

  async findForCompanyByIds(
    conversationIds: number[],
    companyId: number,
  ): Promise<ChatConversation[]> {
    const docs = await this.documents
      .find({ _id: { $in: conversationIds }, companyId })
      .populate({ path: "participants", populate: { path: "user" } })
      .sort({ lastMessageAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithParticipantsOrFail(id: number): Promise<ChatConversation> {
    const doc = await this.documents
      .findById(id)
      .populate({ path: "participants", populate: { path: "user" } })
      .lean()
      .exec();
    if (!doc) {
      throw new Error(`ChatConversation ${id} not found`);
    }
    return this.toDomain(doc) as ChatConversation;
  }

  async findExistingDirectConversation(
    companyId: number,
    userIdA: number,
    userIdB: number,
  ): Promise<ChatConversation | null> {
    const directConversations = await this.documents
      .find({ companyId, type: "direct" })
      .select("_id")
      .lean()
      .exec();
    const candidateIds = directConversations.map((conversation) => conversation._id);
    if (candidateIds.length === 0) {
      return null;
    }

    const participantRows = await this.participantModel
      .find({
        conversationId: { $in: candidateIds },
        userId: { $in: [userIdA, userIdB] },
      })
      .lean()
      .exec();

    const matchedId = candidateIds.find((conversationId) => {
      const users = participantRows
        .filter((row) => row.conversationId === conversationId)
        .map((row) => row.userId);
      return users.includes(userIdA) && users.includes(userIdB);
    });

    if (matchedId === undefined) {
      return null;
    }

    return this.findByIdWithParticipantsOrFail(matchedId as number);
  }
}
