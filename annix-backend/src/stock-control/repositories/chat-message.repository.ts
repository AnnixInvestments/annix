import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ChatMessage } from "../entities/chat-message.entity";

export abstract class ChatMessageRepository extends TenantScopedRepository<ChatMessage> {
  abstract withTransaction(context: TransactionContext): ChatMessageRepository;
  abstract saveForCompany(companyId: number, entity: ChatMessage): Promise<ChatMessage>;
  abstract removeForCompany(companyId: number, entity: ChatMessage): Promise<void>;
  abstract findOneForCompany(id: number, companyId: number): Promise<ChatMessage | null>;
  abstract findMessages(
    companyId: number,
    afterId: number | null,
    conversationId: number | null,
    limit: number,
  ): Promise<ChatMessage[]>;
  abstract countUnreadForConversation(
    companyId: number,
    conversationId: number,
    userId: number,
    lastReadAt: Date | null,
  ): Promise<number>;
  abstract countGeneralUnread(companyId: number, lastReadMessageId: number | null): Promise<number>;
}
