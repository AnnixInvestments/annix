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

export enum TaxInvoiceType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
}

export enum TaxInvoiceStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
}

export interface ExtractedRollDetail {
  rollNumber: string;
  weightKg: number | null;
}

export interface ExtractedTaxInvoiceLineItem {
  description: string;
  compoundCode?: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  rolls?: ExtractedRollDetail[] | null;
}

export interface ExtractedTaxInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  companyName: string | null;
  productSummary: string | null;
  productQuantity?: number | null;
  productUnit?: string | null;
  deliveryNoteRef: string | null;
  orderNumber: string | null;
  lineItems: ExtractedTaxInvoiceLineItem[];
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  originalInvoiceRef?: string | null;
  rollNumbers?: string[] | null;
}

@Entity("rubber_tax_invoices")
export class RubberTaxInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "invoice_number", type: "varchar", length: 100 })
  invoiceNumber: string;

  @Column({ name: "invoice_date", type: "date", nullable: true })
  invoiceDate: Date | null;

  @Column({
    name: "invoice_type",
    type: "varchar",
    length: 20,
  })
  invoiceType: TaxInvoiceType;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "company_id" })
  company: RubberCompany;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: TaxInvoiceStatus.PENDING,
  })
  status: TaxInvoiceStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedTaxInvoiceData | null;

  @Column({ name: "total_amount", type: "decimal", precision: 12, scale: 2, nullable: true })
  totalAmount: string | null;

  @Column({ name: "vat_amount", type: "decimal", precision: 12, scale: 2, nullable: true })
  vatAmount: string | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "exported_to_sage_at", type: "timestamp", nullable: true })
  exportedToSageAt: Date | null;

  @Column({ name: "sage_invoice_id", type: "int", nullable: true })
  sageInvoiceId: number | null;

  @Column({ name: "posted_to_sage_at", type: "timestamp", nullable: true })
  postedToSageAt: Date | null;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @Column({ name: "previous_version_id", type: "int", nullable: true })
  previousVersionId: number | null;

  @ManyToOne(() => RubberTaxInvoice, { nullable: true })
  @JoinColumn({ name: "previous_version_id" })
  previousVersion: RubberTaxInvoice | null;

  @Column({
    name: "version_status",
    type: "varchar",
    length: 30,
    default: DocumentVersionStatus.ACTIVE,
  })
  versionStatus: DocumentVersionStatus;

  @Column({ name: "is_credit_note", type: "boolean", default: false })
  isCreditNote: boolean;

  @Column({ name: "original_invoice_id", type: "int", nullable: true })
  originalInvoiceId: number | null;

  @ManyToOne(() => RubberTaxInvoice, { nullable: true })
  @JoinColumn({ name: "original_invoice_id" })
  originalInvoice: RubberTaxInvoice | null;

  @Column({ name: "credit_note_roll_numbers", type: "jsonb", default: "[]" })
  creditNoteRollNumbers: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
