import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type WhatsAppDirection = "inbound" | "outbound";

@Entity("whatsapp_conversations")
@Index("idx_whatsapp_conversation_wa_id", ["waId"], { unique: true })
export class WhatsAppConversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "wa_id", type: "varchar", length: 32 })
  waId: string;

  @Column({ name: "profile_name", type: "varchar", length: 255, nullable: true })
  profileName: string | null;

  @Column({ name: "last_message_at", type: "timestamptz" })
  lastMessageAt: Date;

  @Column({ name: "last_message_preview", type: "varchar", length: 500, nullable: true })
  lastMessagePreview: string | null;

  @Column({ name: "last_direction", type: "varchar", length: 16 })
  lastDirection: WhatsAppDirection;

  @Column({ name: "unread_count", type: "int", default: 0 })
  unreadCount: number;

  @Column({ name: "app_context", type: "varchar", length: 64, nullable: true })
  appContext: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
