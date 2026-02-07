import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Broadcast } from "./broadcast.entity";

@Entity("broadcast_recipient")
export class BroadcastRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Broadcast,
    (b) => b.recipients,
  )
  @JoinColumn({ name: "broadcast_id" })
  broadcast: Broadcast;

  @Column({ name: "broadcast_id" })
  broadcastId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "read_at", type: "timestamp", nullable: true })
  readAt: Date | null;

  @Column({ name: "email_sent_at", type: "timestamp", nullable: true })
  emailSentAt: Date | null;
}
