import { User } from "../../user/entities/user.entity";
import { Broadcast } from "./broadcast.entity";

export class BroadcastRecipient {
  id: number;

  broadcast: Broadcast;

  broadcastId: number;

  user: User;

  userId: number;

  readAt: Date | null;

  emailSentAt: Date | null;
}
