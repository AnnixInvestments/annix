import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ChatConversationParticipant } from "../entities/chat-conversation-participant.entity";

export abstract class ChatConversationParticipantRepository extends CrudRepository<ChatConversationParticipant> {
  abstract findConversationIdsForUser(userId: number): Promise<number[]>;
  abstract isParticipant(conversationId: number, userId: number): Promise<boolean>;
  abstract findForUser(userId: number): Promise<ChatConversationParticipant[]>;
  abstract createMany(
    rows: Array<{ conversationId: number; userId: number }>,
  ): Promise<ChatConversationParticipant[]>;
  abstract touchLastReadAt(conversationId: number, userId: number, lastReadAt: Date): Promise<void>;
}
