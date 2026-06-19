import { User } from "../../user/entities/user.entity";
import { ConversationParticipant } from "./conversation-participant.entity";
import { Message } from "./message.entity";
import { ConversationType, RelatedEntityType } from "./messaging.enums";

export class Conversation {
  id: number;

  subject: string;

  conversationType: ConversationType;

  relatedEntityType: RelatedEntityType;

  relatedEntityId: number | null;

  createdBy: User;

  createdById: number;

  lastMessageAt: Date | null;

  isArchived: boolean;

  createdAt: Date;

  updatedAt: Date;

  participants: ConversationParticipant[];

  messages: Message[];
}
