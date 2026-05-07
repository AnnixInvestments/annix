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

/**
 * Distinguishes the role of an uploaded document inside a quote/RFQ pack so
 * that downstream AI extraction can apply role-specific prompts and so the
 * cross-document linker (#253 task B) knows what to extract first vs second.
 *
 * - drawing: workshop sheets / spool sheets / isometrics / GA drawings.
 *   Extracted first; produces line items.
 * - specification: paint/lining/fabrication/scope documents. Extracted
 *   second, with the drawings' items as Gemini context, so spec clauses can
 *   be cross-linked to the items they apply to.
 * - other: anything that doesn't fit the above (correspondence, scope of
 *   work narratives, reference docs). Extracted as plain context.
 */
export enum DocumentRole {
  DRAWING = "drawing",
  SPECIFICATION = "specification",
  OTHER = "other",
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

  @ApiProperty({
    description:
      "Owning module key for polymorphic source linkage (e.g. 'rfq', 'asca'). Replaces direct rfq_id FK going forward.",
    required: false,
  })
  @Column({ name: "source_module", type: "varchar", length: 64, nullable: true })
  sourceModule?: string;

  @ApiProperty({
    description: "Source entity ID within the owning module (e.g. RFQ ID, ASCA quote ID).",
    required: false,
  })
  @Column({ name: "source_id", type: "int", nullable: true })
  sourceId?: number;

  @ApiProperty({
    description:
      "Extraction profile key driving prompt + post-extraction handler (e.g. 'rfq-piping', 'asca-quote-documents'). Resolved against NixExtractionProfileRegistry.",
    required: false,
  })
  @Column({ name: "extraction_profile", type: "varchar", length: 64, nullable: true })
  extractionProfile?: string;

  @ApiProperty({
    description:
      "Role of this document within the quote/RFQ pack — drives role-specific prompts and drawings-first ordering for cross-document linking.",
    enum: DocumentRole,
    required: false,
  })
  @Column({
    name: "document_role",
    type: "varchar",
    length: 32,
    nullable: true,
  })
  documentRole?: DocumentRole;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
