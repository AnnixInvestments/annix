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
import { ConversationParticipant } from "./conversation-participant.entity";
import { Message } from "./message.entity";
import { ConversationType, RelatedEntityType } from "./messaging.enums";

@Entity("conversation")
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "subject", length: 255 })
  subject: string;

  @Column({
    name: "conversation_type",
    type: "enum",
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  conversationType: ConversationType;

  @Column({
    name: "related_entity_type",
    type: "enum",
    enum: RelatedEntityType,
    default: RelatedEntityType.GENERAL,
  })
  relatedEntityType: RelatedEntityType;

  @Column({ name: "related_entity_id", type: "int", nullable: true })
  relatedEntityId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;

  @Column({ name: "created_by_id" })
  createdById: number;

  @Column({ name: "last_message_at", type: "timestamp", nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: "is_archived", default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => ConversationParticipant,
    (p) => p.conversation,
  )
  participants: ConversationParticipant[];

  @OneToMany(
    () => Message,
    (m) => m.conversation,
  )
  messages: Message[];
}
