import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { ChatConversation } from "./chat-conversation.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("stock_control_chat_conversation_participants")
@Index(["conversationId", "userId"], { unique: true })
export class ChatConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "conversation_id", type: "int" })
  conversationId: number;

  @ManyToOne(
    () => ChatConversation,
    (c) => c.participants,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "conversation_id" })
  conversation: ChatConversation;

  @Column({ name: "user_id", type: "int" })
  userId: number;

  @ManyToOne(() => StockControlUser)
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "last_read_at", type: "timestamp", nullable: true })
  lastReadAt: Date | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
