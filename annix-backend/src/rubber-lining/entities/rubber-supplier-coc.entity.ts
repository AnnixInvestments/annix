import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";

export enum SupplierCocType {
  COMPOUNDER = "COMPOUNDER",
  CALENDARER = "CALENDARER",
  CALENDER_ROLL = "CALENDER_ROLL",
}

export enum CocProcessingStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
  FAILED = "FAILED",
}

export interface ExtractedCocSpecifications {
  shoreAMin?: number | null;
  shoreAMax?: number | null;
  shoreANominal?: number | null;
  specificGravityMin?: number | null;
  specificGravityMax?: number | null;
  specificGravityNominal?: number | null;
  reboundMin?: number | null;
  reboundMax?: number | null;
  reboundNominal?: number | null;
  tearStrengthMin?: number | null;
  tearStrengthMax?: number | null;
  tearStrengthNominal?: number | null;
  tensileMin?: number | null;
  tensileMax?: number | null;
  tensileNominal?: number | null;
  elongationMin?: number | null;
  elongationMax?: number | null;
  elongationNominal?: number | null;
}

// One row of the batch table's "Count" / "Median" summary block, keyed by the
// same numeric field names as a batch. Used to cross-check extracted batches.
export interface BatchStatRow {
  shoreA?: number | null;
  specificGravity?: number | null;
  reboundPercent?: number | null;
  tearStrengthKnM?: number | null;
  tensileStrengthMpa?: number | null;
  elongationPercent?: number | null;
  rheometerSMin?: number | null;
  rheometerSMax?: number | null;
  rheometerTs2?: number | null;
  rheometerTc90?: number | null;
}

export interface ExtractedCocData {
  cocNumber?: string;
  productionDate?: string;
  customerName?: string;
  compoundCode?: string | null;
  compoundDescription?: string;
  batchNumbers?: string[];
  rollNumbers?: string[];
  orderNumber?: string;
  ticketNumber?: string;
  hasGraph?: boolean;
  approverNames?: string[];
  specifications?: ExtractedCocSpecifications;
  batches?: Array<{
    batchNumber: string;
    shoreA?: number;
    specificGravity?: number;
    reboundPercent?: number;
    tearStrengthKnM?: number;
    tensileStrengthMpa?: number;
    elongationPercent?: number;
    rheometerSMin?: number;
    rheometerSMax?: number;
    rheometerTs2?: number;
    rheometerTc90?: number;
    passFailStatus?: string;
  }>;
  batchStats?: {
    count?: BatchStatRow | null;
    median?: BatchStatRow | null;
  } | null;
  linkedCompounderCocIds?: number[];
  compoundCodingId?: number | null;
  parsedCompoundInfo?: Record<string, any> | null;
  deliveryNoteNumber?: string | null;
  waybillNumber?: string | null;
  rolls?: Array<{
    rollNumber: string;
    shoreA?: number | null;
  }>;
  sharedDensity?: number | null;
  sharedTensile?: number | null;
  sharedElongation?: number | null;
  shoreANominal?: number | null;
  shoreALimits?: string | null;
  densityNominal?: number | null;
  densityLimits?: string | null;
  tensileNominal?: number | null;
  tensileLimits?: string | null;
  elongationNominal?: number | null;
  elongationLimits?: string | null;
  preparedBy?: string | null;
  approvedByName?: string | null;
  documentDate?: string | null;
}

@Entity("rubber_supplier_cocs")
export class RubberSupplierCoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({
    name: "coc_type",
    type: "enum",
    enum: SupplierCocType,
  })
  cocType: SupplierCocType;

  @Column({ name: "supplier_company_id", type: "int" })
  supplierCompanyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "supplier_company_id" })
  supplierCompany: RubberCompany;

  @Column({ name: "document_path", type: "varchar", length: 500 })
  documentPath: string;

  @Column({ name: "graph_pdf_path", type: "varchar", length: 500, nullable: true })
  graphPdfPath: string | null;

  @Column({ name: "coc_number", type: "varchar", length: 255, nullable: true })
  cocNumber: string | null;

  @Column({ name: "production_date", type: "date", nullable: true })
  productionDate: Date | null;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "order_number", type: "varchar", length: 255, nullable: true })
  orderNumber: string | null;

  @Column({ name: "ticket_number", type: "varchar", length: 255, nullable: true })
  ticketNumber: string | null;

  @Column({
    name: "processing_status",
    type: "enum",
    enum: CocProcessingStatus,
    default: CocProcessingStatus.PENDING,
  })
  processingStatus: CocProcessingStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedCocData | null;

  @Column({ name: "review_notes", type: "text", nullable: true })
  reviewNotes: string | null;

  @Column({ name: "approved_by", type: "varchar", length: 100, nullable: true })
  approvedBy: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "linked_delivery_note_id", type: "int", nullable: true })
  linkedDeliveryNoteId: number | null;

  @Column({ name: "linked_calender_roll_coc_id", type: "int", nullable: true })
  linkedCalenderRollCocId: number | null;

  @ManyToOne(() => RubberSupplierCoc, { nullable: true })
  @JoinColumn({ name: "linked_calender_roll_coc_id" })
  linkedCalenderRollCoc: RubberSupplierCoc | null;

  @Column({ name: "exported_to_sage_at", type: "timestamp", nullable: true })
  exportedToSageAt: Date | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @ManyToOne(() => RubberSupplierCoc, { nullable: true })
  @JoinColumn({ name: "previous_version_id" })
  previousVersion: RubberSupplierCoc | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: DocumentVersionStatus.ACTIVE,
  })
  versionStatus: DocumentVersionStatus;

  // SHA-256 of the source PDF. Used to skip creating a CoC when the exact
  // same document has already been ingested (e.g. re-forwarded email).
  @Column({ name: "document_hash", type: "varchar", length: 64, nullable: true })
  documentHash: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
