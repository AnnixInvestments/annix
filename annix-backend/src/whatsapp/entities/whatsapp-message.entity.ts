import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { WhatsAppDirection } from "./whatsapp-conversation.entity";

@Entity("whatsapp_messages")
@Index("idx_whatsapp_message_conversation", ["conversationId", "sentAt"])
export class WhatsAppMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "conversation_id", type: "varchar", length: 64 })
  conversationId: string;

  @Column({ name: "direction", type: "varchar", length: 16 })
  direction: WhatsAppDirection;

  @Column({ name: "body", type: "text" })
  body: string;

  @Column({ name: "message_type", type: "varchar", length: 32, default: "text" })
  messageType: string;

  @Column({ name: "wa_message_id", type: "varchar", length: 128, nullable: true })
  waMessageId: string | null;

  @Column({ name: "status", type: "varchar", length: 32, nullable: true })
  status: string | null;

  @Column({ name: "error_detail", type: "varchar", length: 500, nullable: true })
  errorDetail: string | null;

  @Column({ name: "app_context", type: "varchar", length: 64, nullable: true })
  appContext: string | null;

  @Column({ name: "sent_by", type: "varchar", length: 255, nullable: true })
  sentBy: string | null;

  @Column({ name: "sent_at", type: "timestamptz" })
  sentAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
