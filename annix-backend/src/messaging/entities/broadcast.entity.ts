import { User } from "../../user/entities/user.entity";
import { BroadcastRecipient } from "./broadcast-recipient.entity";
import { BroadcastPriority, BroadcastTarget } from "./messaging.enums";

export class Broadcast {
  id: number;

  title: string;

  content: string;

  targetAudience: BroadcastTarget;

  sentBy: User;

  sentById: number;

  priority: BroadcastPriority;

  expiresAt: Date | null;

  createdAt: Date;

  updatedAt: Date;

  recipients: BroadcastRecipient[];
}
