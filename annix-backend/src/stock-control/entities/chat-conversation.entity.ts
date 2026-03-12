import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatConversationParticipant } from "./chat-conversation-participant.entity";
import { ChatMessage } from "./chat-message.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("stock_control_chat_conversations")
@Index(["companyId"])
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => StockControlCompany)
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ type: "varchar", length: 100, default: "direct" })
  type: "general" | "direct" | "group";

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ name: "created_by_id", type: "int" })
  createdById: number;

  @ManyToOne(() => StockControlUser)
  @JoinColumn({ name: "created_by_id" })
  createdBy: StockControlUser;

  @OneToMany(
    () => ChatConversationParticipant,
    (p) => p.conversation,
  )
  participants: ChatConversationParticipant[];

  @OneToMany(
    () => ChatMessage,
    (m) => m.conversation,
  )
  messages: ChatMessage[];

  @Column({ name: "last_message_at", type: "timestamp", nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
