import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ChatConversationParticipant } from "../entities/chat-conversation-participant.entity";
import { ChatConversationParticipantRepository } from "./chat-conversation-participant.repository";

@Injectable()
export class PostgresChatConversationParticipantRepository
  extends TypeOrmCrudRepository<ChatConversationParticipant>
  implements ChatConversationParticipantRepository
{
  constructor(
    @InjectRepository(ChatConversationParticipant)
    repository: Repository<ChatConversationParticipant>,
  ) {
    super(repository);
  }

  async findConversationIdsForUser(userId: number): Promise<number[]> {
    const participantRows = await this.repository.find({
      where: { userId },
      select: ["conversationId"],
    });
    return participantRows.map((p) => p.conversationId);
  }

  findForUser(userId: number): Promise<ChatConversationParticipant[]> {
    return this.repository.find({ where: { userId } });
  }

  createMany(
    rows: Array<{ conversationId: number; userId: number }>,
  ): Promise<ChatConversationParticipant[]> {
    const participants = rows.map((row) => this.repository.create(row));
    return this.repository.save(participants);
  }

  async touchLastReadAt(conversationId: number, userId: number, lastReadAt: Date): Promise<void> {
    await this.repository.update({ conversationId, userId }, { lastReadAt });
  }
}
