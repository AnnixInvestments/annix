import { User } from "../../user/entities/user.entity";
import { Conversation } from "./conversation.entity";
import { MessageAttachment } from "./message-attachment.entity";
import { MessageReadReceipt } from "./message-read-receipt.entity";
import { MessageType } from "./messaging.enums";

export class Message {
  id: number;

  conversation: Conversation;

  conversationId: number;

  sender: User;

  senderId: number;

  content: string;

  messageType: MessageType;

  parentMessage: Message | null;

  parentMessageId: number | null;

  sentAt: Date;

  editedAt: Date | null;

  isDeleted: boolean;

  attachments: MessageAttachment[];

  readReceipts: MessageReadReceipt[];

  updatedAt: Date;
}
