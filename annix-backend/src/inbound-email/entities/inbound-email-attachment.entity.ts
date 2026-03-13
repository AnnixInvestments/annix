import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { InboundEmail } from "./inbound-email.entity";

export enum AttachmentExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

@Entity("inbound_email_attachments")
export class InboundEmailAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => InboundEmail,
    (email) => email.attachments,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "inbound_email_id" })
  inboundEmail: InboundEmail;

  @Column({ name: "inbound_email_id" })
  inboundEmailId: number;

  @Column({ name: "original_filename", type: "varchar", length: 500 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "file_size_bytes", type: "bigint", default: 0 })
  fileSizeBytes: number;

  @Column({ name: "s3_path", type: "varchar", length: 1000, nullable: true })
  s3Path: string | null;

  @Column({ name: "document_type", type: "varchar", length: 50, default: "unknown" })
  documentType: string;

  @Column({
    name: "classification_confidence",
    type: "numeric",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  classificationConfidence: number | null;

  @Column({ name: "classification_source", type: "varchar", length: 20, nullable: true })
  classificationSource: string | null;

  @Column({ name: "linked_entity_type", type: "varchar", length: 50, nullable: true })
  linkedEntityType: string | null;

  @Column({ name: "linked_entity_id", type: "int", nullable: true })
  linkedEntityId: number | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 30,
    default: AttachmentExtractionStatus.PENDING,
  })
  extractionStatus: AttachmentExtractionStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: object | null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
