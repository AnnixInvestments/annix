import { User } from "../../user/entities/user.entity";
import { Message } from "./message.entity";

export class MessageReadReceipt {
  id: number;

  message: Message;

  messageId: number;

  user: User;

  userId: number;

  readAt: Date;
}
