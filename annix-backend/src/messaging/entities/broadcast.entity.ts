import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { BroadcastRecipient } from "./broadcast-recipient.entity";
import { BroadcastPriority, BroadcastTarget } from "./messaging.enums";

@Entity("broadcast")
export class Broadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "title", length: 255 })
  title: string;

  @Column({ name: "content", type: "text" })
  content: string;

  @Column({
    name: "target_audience",
    type: "enum",
    enum: BroadcastTarget,
    default: BroadcastTarget.ALL,
  })
  targetAudience: BroadcastTarget;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sent_by_id" })
  sentBy: User;

  @Column({ name: "sent_by_id" })
  sentById: number;

  @Column({
    name: "priority",
    type: "enum",
    enum: BroadcastPriority,
    default: BroadcastPriority.NORMAL,
  })
  priority: BroadcastPriority;

  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => BroadcastRecipient,
    (r) => r.broadcast,
  )
  recipients: BroadcastRecipient[];
}
