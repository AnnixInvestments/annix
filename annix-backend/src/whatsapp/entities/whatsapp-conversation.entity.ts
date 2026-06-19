export type WhatsAppDirection = "inbound" | "outbound";

export class WhatsAppConversation {
  id: string;

  waId: string;

  profileName: string | null;

  lastMessageAt: Date;

  lastMessagePreview: string | null;

  lastDirection: WhatsAppDirection;

  unreadCount: number;

  appContext: string | null;

  createdAt: Date;

  updatedAt: Date;
}
