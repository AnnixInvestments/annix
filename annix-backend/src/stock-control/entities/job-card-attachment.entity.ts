import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum AttachmentType {
  DRAWING = "drawing",
  SPECIFICATION = "specification",
  OTHER = "other",
}

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  ANALYSED = "analysed",
  FAILED = "failed",
}

@Entity("job_card_attachments")
export class JobCardAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.attachments,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "attachment_type", type: "varchar", length: 50, default: AttachmentType.DRAWING })
  attachmentType: AttachmentType;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "extraction_status", type: "varchar", length: 50, default: ExtractionStatus.PENDING })
  extractionStatus: ExtractionStatus;

  @Column({ name: "extracted_data", type: "jsonb", default: "{}" })
  extractedData: Record<string, unknown>;

  @Column({ name: "extraction_error", type: "text", nullable: true })
  extractionError: string | null;

  @Column({ name: "extracted_at", type: "timestamp", nullable: true })
  extractedAt: Date | null;

  @Column({ name: "uploaded_by", type: "varchar", length: 255, nullable: true })
  uploadedBy: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
