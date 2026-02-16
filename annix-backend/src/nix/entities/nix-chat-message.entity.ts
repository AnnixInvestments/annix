import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { NixChatSession } from "./nix-chat-session.entity";

@Entity("nix_chat_messages")
@Index(["sessionId", "createdAt"])
export class NixChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "session_id" })
  sessionId: number;

  @ManyToOne(() => NixChatSession)
  @JoinColumn({ name: "session_id" })
  session: NixChatSession;

  @Column({ type: "enum", enum: ["user", "assistant", "system"] })
  role: "user" | "assistant" | "system";

  @Column({ type: "text" })
  content: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    intent?: string;
    itemsCreated?: number;
    validationIssues?: any[];
    suggestionsProvided?: string[];
    tokensUsed?: number;
    processingTimeMs?: number;
    model?: string;
  };

  @Column({ name: "parent_message_id", nullable: true })
  parentMessageId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
