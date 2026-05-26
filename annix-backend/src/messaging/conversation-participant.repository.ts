import { CrudRepository } from "../lib/persistence/crud-repository";
import { ConversationParticipant } from "./entities/conversation-participant.entity";

export abstract class ConversationParticipantRepository extends CrudRepository<ConversationParticipant> {
  abstract findActiveByConversationAndUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant | null>;
  abstract findActiveByConversation(conversationId: number): Promise<ConversationParticipant[]>;
  abstract findActiveByUser(userId: number): Promise<ConversationParticipant[]>;
  abstract findActiveByConversationExcludingUser(
    conversationId: number,
    userId: number,
  ): Promise<ConversationParticipant[]>;
  abstract deleteByConversationIds(conversationIds: number[]): Promise<void>;
}
