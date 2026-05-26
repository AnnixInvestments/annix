import { CrudRepository } from "../lib/persistence/crud-repository";
import { Message } from "./entities/message.entity";

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

export interface MessagePagination {
  limit?: number;
  beforeId?: number;
  afterId?: number;
}

export abstract class MessageRepository extends CrudRepository<Message> {
  abstract findPageForConversation(
    conversationId: number,
    pagination: MessagePagination,
  ): Promise<MessagePage>;
  abstract findPreviousFromOtherSender(
    conversationId: number,
    senderId: number,
  ): Promise<Message | null>;
  abstract countUnreadForParticipant(
    conversationId: number,
    userId: number,
    afterDate: Date | null,
  ): Promise<number>;
  abstract deleteByConversationIds(conversationIds: number[]): Promise<void>;
}
