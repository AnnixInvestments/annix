import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { User } from "../../user/entities/user.entity";
import { NixExtractionSession } from "./nix-extraction-session.entity";

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
  TEXT = "text",
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
@Index("idx_nix_extractions_mine_doc", ["mineId", "documentNumber"])
@Index("idx_nix_extractions_doc_number", ["documentNumber"])
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

  @ApiProperty({
    description:
      "Durable S3 key for the uploaded source document. Resolved against the storage service's bucket configuration and storage_area. Distinct from documentPath (which records the temporary processing path).",
    required: false,
  })
  @Column({ name: "storage_path", type: "varchar", length: 512, nullable: true })
  storagePath?: string;

  @ApiProperty({
    description:
      "Top-level StorageArea (e.g. 'stock-control', 'annix-app') the storage_path lives under.",
    required: false,
  })
  @Column({ name: "storage_area", type: "varchar", length: 64, nullable: true })
  storageArea?: string;

  @ApiProperty({
    description: "Size of the stored object in bytes (mirrors S3 metadata).",
    required: false,
  })
  @Column({ name: "storage_size_bytes", type: "bigint", nullable: true })
  storageSizeBytes?: number;

  @ApiProperty({
    description: "MIME type of the stored object (mirrors S3 metadata).",
    required: false,
  })
  @Column({ name: "storage_mime_type", type: "varchar", length: 128, nullable: true })
  storageMimeType?: string;

  @ManyToOne(
    () => NixExtractionSession,
    (session) => session.extractions,
    { nullable: true },
  )
  @JoinColumn({ name: "session_id" })
  session?: NixExtractionSession;

  @ApiProperty({
    description:
      "FK to the NixExtractionSession this extraction belongs to. Null for one-off uploads (legacy / standalone /nix/upload calls).",
    required: false,
  })
  @Column({ name: "session_id", type: "int", nullable: true })
  sessionId?: number;

  @ApiProperty({
    description:
      "ID of the matched mine within its country table (issue #264). Disambiguated by mineCountry — one of botswana_mines / namibia_mines / sa_mines / zimbabwe_mines / zambia_mines / mozambique_mines. Populated by MineInferenceService when Gemini metadata yields a confident match. Null when the document couldn't be tied to a known mine.",
    required: false,
  })
  @Column({ name: "mine_id", type: "int", nullable: true })
  mineId?: number;

  @ApiProperty({
    description:
      "Country whose mine table mineId references — 'South Africa', 'Botswana', 'Namibia', 'Zimbabwe', 'Zambia', or 'Mozambique'. Required to dereference mineId because the FK constraint was dropped when international mine tables were added.",
    required: false,
  })
  @Column({ name: "mine_country", type: "varchar", length: 64, nullable: true })
  mineCountry?: string;

  /**
   * Virtual — not persisted. NixExtractionSessionService populates this
   * with the friendly mine name (resolved via MineRegistryService against
   * the country table referenced by mineCountry) when a session is loaded,
   * so the frontend MineInferenceBadge can render 'Tagged: Langer Heinrich
   * Uranium Mine' instead of 'Tagged: Mine #2'.
   */
  mineName?: string;

  @ApiProperty({
    description:
      "Confidence score (0..1) of the mine inference. >= 0.8 = strong (auto-attached); 0.5–0.8 = weak (attached but flagged for user review); < 0.5 = no attach.",
    required: false,
  })
  @Column({ name: "mine_inference_confidence", type: "real", nullable: true })
  mineInferenceConfidence?: number;

  @ApiProperty({
    description:
      "Human-readable explanation of why the mine inference matched. e.g. 'project name match (Langer Heinrich)' or 'document number prefix LHU-'.",
    required: false,
  })
  @Column({
    name: "mine_inference_reason",
    type: "varchar",
    length: 256,
    nullable: true,
  })
  mineInferenceReason?: string;

  @ApiProperty({
    description:
      "Canonical document number extracted from the title block (e.g. 'LHU-0000-EP-2701-012-00'). Used by the mine library for cross-quote reuse — a future quote referencing the same number can pull this extraction's clauses directly.",
    required: false,
  })
  @Column({ name: "document_number", type: "varchar", length: 128, nullable: true })
  documentNumber?: string;

  @ApiProperty({
    description: "Document revision extracted from the title block (e.g. '00', 'AF', 'Rev A').",
    required: false,
  })
  @Column({ name: "document_revision", type: "varchar", length: 32, nullable: true })
  documentRevision?: string;

  @ApiProperty({
    description:
      "Denormalised flag set false when a higher-revision extraction has been added to the library for the same (mineCountry, mineId, documentNumber). Inference / cross-quote reuse only return rows where this is true. Defaults true for first-time uploads.",
  })
  @Column({ name: "is_latest_revision", type: "boolean", default: true })
  isLatestRevision: boolean;

  @ApiProperty({
    description:
      "When this extraction is no longer the latest revision (is_latest_revision = false), points to the newer-rev extraction that superseded it so the UI can render a 'see latest →' link.",
    required: false,
  })
  @Column({ name: "superseded_by_extraction_id", type: "int", nullable: true })
  supersededByExtractionId?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
