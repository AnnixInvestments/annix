import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type ProductDatasheetType = "paint" | "rubber_compound" | "solution" | "consumable";

export type ProductDatasheetDocType = "tds" | "sds" | "msds" | "product_info" | "application_guide";

export type ProductDatasheetExtractionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "manual_only";

@Entity("sm_product_datasheet")
export class ProductDatasheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "product_type", type: "varchar", length: 32 })
  productType: ProductDatasheetType;

  @Column({ name: "paint_product_id", type: "integer", nullable: true })
  paintProductId: number | null;

  @Column({ name: "rubber_compound_id", type: "integer", nullable: true })
  rubberCompoundId: number | null;

  @Column({ name: "solution_product_id", type: "integer", nullable: true })
  solutionProductId: number | null;

  @Column({ name: "consumable_product_id", type: "integer", nullable: true })
  consumableProductId: number | null;

  @Column({ name: "doc_type", type: "varchar", length: 32, default: "tds" })
  docType: ProductDatasheetDocType;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "revision_number", type: "integer", default: 1 })
  revisionNumber: number;

  @Column({ name: "issued_at", type: "date", nullable: true })
  issuedAt: string | null;

  @Column({ name: "expires_at", type: "date", nullable: true })
  expiresAt: string | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 32,
    default: "pending",
  })
  extractionStatus: ProductDatasheetExtractionStatus;

  @Column({ name: "extraction_started_at", type: "timestamp", nullable: true })
  extractionStartedAt: Date | null;

  @Column({ name: "extraction_completed_at", type: "timestamp", nullable: true })
  extractionCompletedAt: Date | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: Record<string, unknown> | null;

  @Column({ name: "extraction_model", type: "varchar", length: 64, nullable: true })
  extractionModel: string | null;

  @Column({ name: "extraction_notes", type: "text", nullable: true })
  extractionNotes: string | null;

  @CreateDateColumn({ name: "uploaded_at" })
  uploadedAt: Date;

  @Column({ name: "uploaded_by_id", type: "integer", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
