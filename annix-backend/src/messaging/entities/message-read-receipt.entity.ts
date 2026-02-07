import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Message } from "./message.entity";

@Entity("message_read_receipt")
export class MessageReadReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Message,
    (m) => m.readReceipts,
  )
  @JoinColumn({ name: "message_id" })
  message: Message;

  @Column({ name: "message_id" })
  messageId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "read_at", type: "timestamp", default: () => "now()" })
  readAt: Date;
}
