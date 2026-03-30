import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "./company.entity";
import { Contact } from "./contact.entity";

export enum CertificateSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum CertificateCategory {
  COA = "COA",
  COC = "COC",
  COMPOUNDER = "COMPOUNDER",
  CALENDARER = "CALENDARER",
  CALENDER_ROLL = "CALENDER_ROLL",
  CALIBRATION = "CALIBRATION",
}

export enum CertificateProcessingStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
}

@Entity("platform_certificates")
export class PlatformCertificate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "source_module", type: "varchar", length: 30 })
  sourceModule: CertificateSourceModule;

  @Column({
    name: "certificate_category",
    type: "varchar",
    length: 30,
  })
  certificateCategory: CertificateCategory;

  @Column({ name: "certificate_number", type: "varchar", length: 100, nullable: true })
  certificateNumber: string | null;

  @Column({ name: "batch_number", type: "varchar", length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "supplier_contact_id", type: "int", nullable: true })
  supplierContactId: number | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_contact_id" })
  supplierContact: Contact | null;

  @Column({ name: "file_path", type: "varchar", length: 500, nullable: true })
  filePath: string | null;

  @Column({ name: "graph_pdf_path", type: "varchar", length: 500, nullable: true })
  graphPdfPath: string | null;

  @Column({ name: "original_filename", type: "varchar", length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: "file_size_bytes", type: "bigint", nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: "mime_type", type: "varchar", length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "production_date", type: "date", nullable: true })
  productionDate: Date | null;

  @Column({ name: "expiry_date", type: "date", nullable: true })
  expiryDate: Date | null;

  @Column({
    name: "processing_status",
    type: "varchar",
    length: 30,
    default: CertificateProcessingStatus.PENDING,
  })
  processingStatus: CertificateProcessingStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: Record<string, unknown> | null;

  @Column({ name: "review_notes", type: "text", nullable: true })
  reviewNotes: string | null;

  @Column({ name: "approved_by", type: "varchar", length: 255, nullable: true })
  approvedBy: string | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @Column({ name: "exported_to_sage_at", type: "timestamptz", nullable: true })
  exportedToSageAt: Date | null;

  @Column({ name: "linked_delivery_note_id", type: "int", nullable: true })
  linkedDeliveryNoteId: number | null;

  @Column({ name: "linked_calender_roll_coc_id", type: "int", nullable: true })
  linkedCalenderRollCocId: number | null;

  @Column({ name: "stock_item_id", type: "int", nullable: true })
  stockItemId: number | null;

  @Column({ name: "job_card_id", type: "int", nullable: true })
  jobCardId: number | null;

  @Column({ name: "order_number", type: "varchar", length: 100, nullable: true })
  orderNumber: string | null;

  @Column({ name: "ticket_number", type: "varchar", length: 100, nullable: true })
  ticketNumber: string | null;

  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: "ACTIVE",
  })
  versionStatus: string;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, nullable: true })
  firebaseUid: string | null;

  @Column({ name: "legacy_sc_certificate_id", type: "int", nullable: true })
  legacyScCertificateId: number | null;

  @Column({ name: "legacy_sc_calibration_id", type: "int", nullable: true })
  legacyScCalibrationId: number | null;

  @Column({ name: "legacy_rubber_coc_id", type: "int", nullable: true })
  legacyRubberCocId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
