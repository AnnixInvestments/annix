import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ConversationParticipantRepository } from "./conversation-participant.repository";
import { ConversationParticipant } from "./entities/conversation-participant.entity";

@Injectable()
export class PostgresConversationParticipantRepository
  extends TypeOrmCrudRepository<ConversationParticipant>
  implements ConversationParticipantRepository
{
  constructor(
    @InjectRepository(ConversationParticipant)
    repository: Repository<ConversationParticipant>,
  ) {
    super(repository);
  }

  findActiveByConversationAndUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant | null> {
    return this.repository.findOne({ where: { conversationId, userId, isActive: true } });
  }

  findActiveByConversation(conversationId: number): Promise<ConversationParticipant[]> {
    return this.repository.find({
      where: { conversationId, isActive: true },
      relations: ["user"],
    });
  }

  findActiveByUser(userId: number): Promise<ConversationParticipant[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      select: ["conversationId"],
    });
  }

  findActiveByConversationExcludingUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant[]> {
    return this.repository.find({
      where: { conversationId, isActive: true, userId: Not(userId) },
      relations: ["user", "user.roles"],
    });
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.repository.delete({ conversationId: In(conversationIds) });
  }
}
