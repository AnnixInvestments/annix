import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CustomerProfile } from "../../customer/entities/customer-profile.entity";
import { Conversation } from "../../messaging/entities/conversation.entity";
import { User } from "../../user/entities/user.entity";

export type FeedbackSource = "text" | "voice";

@Entity("customer_feedback")
export class CustomerFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_profile_id" })
  customerProfile: CustomerProfile;

  @Column({ name: "customer_profile_id" })
  customerProfileId: number;

  @ManyToOne(() => Conversation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation | null;

  @Column({ name: "conversation_id", nullable: true })
  conversationId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo: User | null;

  @Column({ name: "assigned_to_id", nullable: true })
  assignedToId: number | null;

  @Column({ type: "text" })
  content: string;

  @Column({ length: 10, default: "text" })
  source: FeedbackSource;

  @Column({ name: "page_url", type: "varchar", length: 500, nullable: true })
  pageUrl: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
