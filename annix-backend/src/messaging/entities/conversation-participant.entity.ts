import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Conversation } from "./conversation.entity";
import { ParticipantRole } from "./messaging.enums";

@Entity("conversation_participant")
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Conversation,
    (c) => c.participants,
  )
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @Column({ name: "conversation_id" })
  conversationId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    name: "role",
    type: "enum",
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
  })
  role: ParticipantRole;

  @Column({ name: "joined_at", type: "timestamp", default: () => "now()" })
  joinedAt: Date;

  @Column({ name: "left_at", type: "timestamp", nullable: true })
  leftAt: Date | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "last_read_at", type: "timestamp", nullable: true })
  lastReadAt: Date | null;
}
