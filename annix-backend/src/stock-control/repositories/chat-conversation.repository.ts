import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ChatConversation } from "../entities/chat-conversation.entity";

export abstract class ChatConversationRepository extends CrudRepository<ChatConversation> {
  abstract touchLastMessageAt(conversationId: number, lastMessageAt: Date): Promise<void>;
  abstract findForCompanyByIds(
    conversationIds: number[],
    companyId: number,
  ): Promise<ChatConversation[]>;
  abstract findByIdWithParticipantsOrFail(id: number): Promise<ChatConversation>;
  abstract findExistingDirectConversation(
    companyId: number,
    userIdA: number,
    userIdB: number,
  ): Promise<ChatConversation | null>;
}
