import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ChatConversation } from "../entities/chat-conversation.entity";
import { ChatConversationRepository } from "./chat-conversation.repository";

@Injectable()
export class MongoChatConversationRepository
  extends MongoCrudRepository<ChatConversation>
  implements ChatConversationRepository
{
  constructor(@InjectModel("ChatConversation") model: Model<ChatConversation>) {
    super(model);
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
