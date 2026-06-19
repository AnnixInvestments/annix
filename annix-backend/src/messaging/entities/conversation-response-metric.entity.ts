import { User } from "../../user/entities/user.entity";
import { Conversation } from "./conversation.entity";
import { Message } from "./message.entity";
import { ResponseRating } from "./messaging.enums";

export class ConversationResponseMetric {
  id: number;

  conversation: Conversation;

  conversationId: number;

  message: Message;

  messageId: number;

  responseMessage: Message;

  responseMessageId: number;

  responder: User;

  responderId: number;

  responseTimeMinutes: number;

  withinSla: boolean;

  rating: ResponseRating;

  createdAt: Date;
}
