import { User } from "../../user/entities/user.entity";
import { Conversation } from "./conversation.entity";
import { ParticipantRole } from "./messaging.enums";

export class ConversationParticipant {
  id: number;

  conversation: Conversation;

  conversationId: number;

  user: User;

  userId: number;

  role: ParticipantRole;

  joinedAt: Date;

  leftAt: Date | null;

  isActive: boolean;

  lastReadAt: Date | null;
}
