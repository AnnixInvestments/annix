import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { User } from "../../user/entities/user.entity";

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  NEEDS_CLARIFICATION = "needs_clarification",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum DocumentType {
  PDF = "pdf",
  EXCEL = "excel",
  WORD = "word",
  CAD = "cad",
  SOLIDWORKS = "solidworks",
  IMAGE = "image",
  UNKNOWN = "unknown",
}

@Entity("nix_extractions")
export class NixExtraction {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Original document filename" })
  @Column({ name: "document_name" })
  documentName: string;

  @ApiProperty({ description: "Document storage path or URL" })
  @Column({ name: "document_path" })
  documentPath: string;

  @ApiProperty({ description: "Type of document", enum: DocumentType })
  @Column({
    name: "document_type",
    type: "enum",
    enum: DocumentType,
    default: DocumentType.UNKNOWN,
  })
  documentType: DocumentType;

  @ApiProperty({ description: "Extraction status", enum: ExtractionStatus })
  @Column({
    name: "status",
    type: "enum",
    enum: ExtractionStatus,
    default: ExtractionStatus.PENDING,
  })
  status: ExtractionStatus;

  @ApiProperty({ description: "Raw extracted text from document" })
  @Column({ name: "raw_text", type: "text", nullable: true })
  rawText?: string;

  @ApiProperty({ description: "Extracted structured data as JSON" })
  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData?: Record<string, any>;

  @ApiProperty({ description: "Extracted items for RFQ" })
  @Column({ name: "extracted_items", type: "jsonb", nullable: true })
  extractedItems?: Array<{
    description: string;
    quantity?: number;
    unit?: string;
    specifications?: Record<string, any>;
    pageReference?: number;
    confidence: number;
  }>;

  @ApiProperty({ description: "Relevance score for tender processing" })
  @Column({
    name: "relevance_score",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  relevanceScore?: number;

  @ApiProperty({ description: "Number of pages in document" })
  @Column({ name: "page_count", nullable: true })
  pageCount?: number;

  @ApiProperty({ description: "Processing error message if failed" })
  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string;

  @ApiProperty({ description: "Processing time in milliseconds" })
  @Column({ name: "processing_time_ms", nullable: true })
  processingTimeMs?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ name: "user_id", nullable: true })
  userId?: number;

  @ManyToOne(() => Rfq, { nullable: true })
  @JoinColumn({ name: "rfq_id" })
  rfq?: Rfq;

  @Column({ name: "rfq_id", nullable: true })
  rfqId?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
