import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { ChatConversation } from "./chat-conversation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class ChatMessage {
  id: number;

  companyId: number;

  company: StockControlCompany;

  conversationId: number | null;

  conversation: ChatConversation | null;

  senderId: number;

  sender: StockControlUser;

  senderName: string;

  text: string;

  imageUrl: string | null;

  editedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedSender?: User | null;

  unifiedSenderId?: number | null;

  createdAt: Date;
}
