import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { InboundEmailAttachment } from "./inbound-email-attachment.entity";
import { InboundEmailConfig } from "./inbound-email-config.entity";

export enum InboundEmailStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  PARTIAL = "partial",
  FAILED = "failed",
  UNCLASSIFIED = "unclassified",
}

@Entity("inbound_emails")
@Unique(["messageId"])
export class InboundEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InboundEmailConfig, { onDelete: "CASCADE" })
  @JoinColumn({ name: "config_id" })
  config: InboundEmailConfig;

  @Column({ name: "config_id" })
  configId: number;

  @Column({ type: "varchar", length: 50 })
  app: string;

  @Column({ name: "company_id", type: "int", nullable: true })
  companyId: number | null;

  @Column({ name: "message_id", type: "varchar", length: 500 })
  messageId: string;

  @Column({ name: "from_email", type: "varchar", length: 255 })
  fromEmail: string;

  @Column({ name: "from_name", type: "varchar", length: 255, nullable: true })
  fromName: string | null;

  @Column({ type: "text", nullable: true })
  subject: string | null;

  @Column({ name: "received_at", type: "timestamp", nullable: true })
  receivedAt: Date | null;

  @Column({ name: "attachment_count", type: "int", default: 0 })
  attachmentCount: number;

  @Column({
    name: "processing_status",
    type: "varchar",
    length: 30,
    default: InboundEmailStatus.PENDING,
  })
  processingStatus: InboundEmailStatus;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @OneToMany(
    () => InboundEmailAttachment,
    (attachment) => attachment.inboundEmail,
  )
  attachments: InboundEmailAttachment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
