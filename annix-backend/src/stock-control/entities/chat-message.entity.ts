import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatConversation } from "./chat-conversation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("stock_control_chat_messages")
@Index(["companyId", "createdAt"])
@Index(["conversationId", "createdAt"])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => StockControlCompany)
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "conversation_id", type: "int", nullable: true })
  conversationId: number | null;

  @ManyToOne(
    () => ChatConversation,
    (c) => c.messages,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "conversation_id" })
  conversation: ChatConversation | null;

  @Column({ name: "sender_id", type: "int" })
  senderId: number;

  @ManyToOne(() => StockControlUser)
  @JoinColumn({ name: "sender_id" })
  sender: StockControlUser;

  @Column({ name: "sender_name", type: "varchar", length: 255 })
  senderName: string;

  @Column({ type: "text" })
  text: string;

  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: "edited_at", type: "timestamp", nullable: true })
  editedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
