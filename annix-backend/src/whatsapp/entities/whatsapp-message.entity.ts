import type { WhatsAppDirection } from "./whatsapp-conversation.entity";

export class WhatsAppMessage {
  id: string;

  conversationId: string;

  direction: WhatsAppDirection;

  body: string;

  messageType: string;

  waMessageId: string | null;

  status: string | null;

  errorDetail: string | null;

  appContext: string | null;

  sentBy: string | null;

  sentAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
