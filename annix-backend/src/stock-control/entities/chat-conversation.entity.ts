import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { ChatConversationParticipant } from "./chat-conversation-participant.entity";
import { ChatMessage } from "./chat-message.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class ChatConversation {
  id: number;

  companyId: number;

  company: StockControlCompany;

  type: "general" | "direct" | "group";

  name: string | null;

  createdById: number;

  createdBy: StockControlUser;

  participants: ChatConversationParticipant[];

  messages: ChatMessage[];

  lastMessageAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCreatedBy?: User | null;

  unifiedCreatedById?: number | null;

  createdAt: Date;
}
