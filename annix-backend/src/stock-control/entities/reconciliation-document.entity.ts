import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

export enum ReconciliationDocCategory {
  JT_DN = "jt_dn",
  SALES_ORDER = "sales_order",
  CPO = "cpo",
  DRAWING = "drawing",
  POLYMER_DN = "polymer_dn",
  MPS_DN = "mps_dn",
}

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface ExtractedLineItem {
  itemDescription: string;
  itemCode: string | null;
  quantity: number;
  referenceNumber: string | null;
}

@Entity("reconciliation_documents")
export class ReconciliationDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "job_card_id", type: "integer" })
  jobCardId: number;

  @Column({ name: "document_category", type: "varchar", length: 50 })
  documentCategory: ReconciliationDocCategory;

  @Column({ name: "file_path", type: "text" })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: "file_size_bytes", type: "integer", nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: "uploaded_by_id", type: "integer", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 20,
    default: ExtractionStatus.PENDING,
  })
  extractionStatus: ExtractionStatus;

  @Column({ name: "extracted_items", type: "jsonb", nullable: true })
  extractedItems: ExtractedLineItem[] | null;

  @Column({ name: "extraction_error", type: "text", nullable: true })
  extractionError: string | null;

  @Column({ name: "extracted_at", type: "timestamp", nullable: true })
  extractedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
