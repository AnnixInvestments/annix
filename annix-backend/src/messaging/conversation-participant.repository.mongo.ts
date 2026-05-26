import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ConversationParticipantRepository } from "./conversation-participant.repository";
import { ConversationParticipant } from "./entities/conversation-participant.entity";

@Injectable()
export class MongoConversationParticipantRepository
  extends MongoCrudRepository<ConversationParticipant>
  implements ConversationParticipantRepository
{
  constructor(@InjectModel("ConversationParticipant") model: Model<ConversationParticipant>) {
    super(model);
  }

  async findActiveByConversationAndUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant | null> {
    const document = await this.documents
      .findOne({ conversationId, userId, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findActiveByConversation(conversationId: number): Promise<ConversationParticipant[]> {
    const documents = await this.documents.find({ conversationId, isActive: true }).lean().exec();
    return this.toDomainList(documents);
  }

  async findActiveByUser(userId: number): Promise<ConversationParticipant[]> {
    const documents = await this.documents
      .find({ userId, isActive: true }, { conversationId: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findActiveByConversationExcludingUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant[]> {
    const documents = await this.documents
      .find({ conversationId, isActive: true, userId: { $ne: userId } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.documents.deleteMany({ conversationId: { $in: conversationIds } }).exec();
  }
}
