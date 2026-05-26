import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ChatConversationParticipant } from "../entities/chat-conversation-participant.entity";
import { ChatConversationParticipantRepository } from "./chat-conversation-participant.repository";

@Injectable()
export class MongoChatConversationParticipantRepository
  extends MongoCrudRepository<ChatConversationParticipant>
  implements ChatConversationParticipantRepository
{
  constructor(
    @InjectModel("ChatConversationParticipant") model: Model<ChatConversationParticipant>,
  ) {
    super(model);
  }

  async findConversationIdsForUser(userId: number): Promise<number[]> {
    const participantRows = await this.documents
      .find({ userId })
      .select("conversationId")
      .lean()
      .exec();
    return participantRows.map((p) => p.conversationId as number);
  }

  async findForUser(userId: number): Promise<ChatConversationParticipant[]> {
    const docs = await this.documents.find({ userId }).lean().exec();
    return this.toDomainList(docs);
  }

  async createMany(
    rows: Array<{ conversationId: number; userId: number }>,
  ): Promise<ChatConversationParticipant[]> {
    return Promise.all(rows.map((row) => this.create(row as never)));
  }

  async touchLastReadAt(conversationId: number, userId: number, lastReadAt: Date): Promise<void> {
    await this.documents.updateOne({ conversationId, userId }, { lastReadAt }).exec();
  }
}
