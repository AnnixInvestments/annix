import { User } from "../../user/entities/user.entity";
import { ChatConversation } from "./chat-conversation.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class ChatConversationParticipant {
  id: number;

  conversationId: number;

  conversation: ChatConversation;

  userId: number;

  user: StockControlUser;

  lastReadAt: Date | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  createdAt: Date;
}
