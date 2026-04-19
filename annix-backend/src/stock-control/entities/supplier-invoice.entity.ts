import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { DeliveryNote } from "./delivery-note.entity";
import { InvoiceClarification } from "./invoice-clarification.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

export enum InvoiceExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  NEEDS_CLARIFICATION = "needs_clarification",
  AWAITING_APPROVAL = "awaiting_approval",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  supplierName?: string;
  invoiceDate?: string;
  totalAmount?: number;
  vatAmount?: number;
  deliveryNoteNumber?: string;
  deliveryNoteNumbers?: string[];
  lineItems?: ExtractedLineItem[];
  rawText?: string;
}

export interface ExtractedLineItem {
  lineNumber: number;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitType?: string;
  discountPercent?: number;
  isPaintPartA?: boolean;
  isPaintPartB?: boolean;
  volumeLitresPerPack?: number | null;
}

@Entity("supplier_invoices")
export class SupplierInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => DeliveryNote, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: DeliveryNote | null;

  @Column({ name: "delivery_note_id", nullable: true })
  deliveryNoteId: number | null;

  @Column({ name: "invoice_number", type: "varchar", length: 100 })
  invoiceNumber: string;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

  @ManyToOne(() => StockControlSupplier, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_id" })
  supplier: StockControlSupplier | null;

  @Column({ name: "supplier_id", nullable: true })
  supplierId: number | null;

  @Column({ name: "invoice_date", type: "date", nullable: true })
  invoiceDate: Date | null;

  @Column({ name: "total_amount", type: "numeric", precision: 12, scale: 2, nullable: true })
  totalAmount: number | null;

  @Column({ name: "vat_amount", type: "numeric", precision: 12, scale: 2, nullable: true })
  vatAmount: number | null;

  @Column({ name: "scan_url", type: "text", nullable: true })
  scanUrl: string | null;

  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 50,
    default: InvoiceExtractionStatus.PENDING,
  })
  extractionStatus: InvoiceExtractionStatus;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedInvoiceData | null;

  @ManyToOne(() => StockControlUser, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approvedByUser: StockControlUser | null;

  @Column({ name: "approved_by", nullable: true })
  approvedBy: number | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "exported_to_sage_at", type: "timestamp", nullable: true })
  exportedToSageAt: Date | null;

  @Column({ name: "linked_delivery_note_ids", type: "jsonb", nullable: true, default: null })
  linkedDeliveryNoteIds: number[] | null;

  @OneToMany(
    () => SupplierInvoiceItem,
    (item) => item.invoice,
  )
  items: SupplierInvoiceItem[];

  @OneToMany(
    () => InvoiceClarification,
    (clarification) => clarification.invoice,
  )
  clarifications: InvoiceClarification[];

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_approved_by" })
  unifiedApprovedByUser?: User | null;

  @Column({ name: "unified_approved_by", nullable: true })
  unifiedApprovedBy?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
