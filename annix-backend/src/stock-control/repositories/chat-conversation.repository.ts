import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ChatConversation } from "../entities/chat-conversation.entity";

export abstract class ChatConversationRepository extends TenantScopedRepository<ChatConversation> {
  abstract withTransaction(context: TransactionContext): ChatConversationRepository;
  abstract saveForCompany(companyId: number, entity: ChatConversation): Promise<ChatConversation>;
  abstract removeForCompany(companyId: number, entity: ChatConversation): Promise<void>;
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
