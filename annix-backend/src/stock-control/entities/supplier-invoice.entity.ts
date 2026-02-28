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
import { DeliveryNote } from "./delivery-note.entity";
import { InvoiceClarification } from "./invoice-clarification.entity";
import { StockControlCompany } from "./stock-control-company.entity";
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
  lineItems?: ExtractedLineItem[];
  rawText?: string;
}

export interface ExtractedLineItem {
  lineNumber: number;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  isPaintPartA?: boolean;
  isPaintPartB?: boolean;
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

  @ManyToOne(() => DeliveryNote, { onDelete: "CASCADE" })
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: DeliveryNote;

  @Column({ name: "delivery_note_id" })
  deliveryNoteId: number;

  @Column({ name: "invoice_number", type: "varchar", length: 100 })
  invoiceNumber: string;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
