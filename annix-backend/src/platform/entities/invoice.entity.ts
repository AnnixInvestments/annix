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

export enum InvoiceSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum InvoiceType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
}

export enum InvoiceExtractionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION",
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum InvoiceStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
}

@Entity("platform_invoices")
export class PlatformInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "source_module", type: "varchar", length: 30 })
  sourceModule: InvoiceSourceModule;

  @Column({
    name: "invoice_type",
    type: "varchar",
    length: 20,
    default: InvoiceType.SUPPLIER,
  })
  invoiceType: InvoiceType;

  @Column({ name: "invoice_number", type: "varchar", length: 100 })
  invoiceNumber: string;

  @Column({ name: "invoice_date", type: "date", nullable: true })
  invoiceDate: Date | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "supplier_contact_id", type: "int", nullable: true })
  supplierContactId: number | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_contact_id" })
  supplierContact: Contact | null;

  @Column({ name: "total_amount", type: "decimal", precision: 12, scale: 2, nullable: true })
  totalAmount: number | null;

  @Column({ name: "vat_amount", type: "decimal", precision: 12, scale: 2, nullable: true })
  vatAmount: number | null;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 50,
    default: InvoiceExtractionStatus.PENDING,
  })
  extractionStatus: InvoiceExtractionStatus;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: Record<string, unknown> | null;

  @Column({ name: "approved_by", type: "varchar", length: 255, nullable: true })
  approvedBy: string | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "exported_to_sage_at", type: "timestamptz", nullable: true })
  exportedToSageAt: Date | null;

  @Column({ name: "sage_invoice_id", type: "int", nullable: true })
  sageInvoiceId: number | null;

  @Column({ name: "posted_to_sage_at", type: "timestamptz", nullable: true })
  postedToSageAt: Date | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "linked_delivery_note_ids", type: "jsonb", nullable: true })
  linkedDeliveryNoteIds: number[] | null;

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

  @Column({ name: "legacy_sc_invoice_id", type: "int", nullable: true })
  legacyScInvoiceId: number | null;

  @Column({ name: "legacy_rubber_invoice_id", type: "int", nullable: true })
  legacyRubberInvoiceId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
