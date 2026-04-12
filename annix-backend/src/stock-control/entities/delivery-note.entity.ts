import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeliveryNoteItem } from "./delivery-note-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";

export interface ExtractedDeliveryData {
  deliveryNumber?: string;
  supplierName?: string;
  receivedDate?: string;
  lineItems?: {
    description: string;
    quantity: number;
    sku?: string;
    rollNumber?: string;
    weightKg?: number;
  }[];
  rawText?: string;
}

export const SdnStatus = {
  PENDING_REVIEW: "PENDING_REVIEW",
  CONFIRMED: "CONFIRMED",
  STOCK_LINKED: "STOCK_LINKED",
} as const;

export type SdnStatusType = (typeof SdnStatus)[keyof typeof SdnStatus];

@Entity("delivery_notes")
export class DeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "delivery_number", type: "varchar", length: 100 })
  deliveryNumber: string;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

  @ManyToOne(() => StockControlSupplier, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_id" })
  supplier: StockControlSupplier | null;

  @Column({ name: "supplier_id", nullable: true })
  supplierId: number | null;

  @Column({ name: "received_date", type: "timestamp", nullable: true })
  receivedDate: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "received_by", type: "varchar", length: 255, nullable: true })
  receivedBy: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => DeliveryNoteItem,
    (item) => item.deliveryNote,
  )
  items: DeliveryNoteItem[];

  @Column({ name: "sdn_status", type: "varchar", length: 30, default: "'CONFIRMED'" })
  sdnStatus: string;

  @Column({ name: "extraction_status", type: "varchar", length: 50, nullable: true })
  extractionStatus: string | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedDeliveryData | null;

  @OneToMany(
    () => SupplierInvoice,
    (invoice) => invoice.deliveryNote,
  )
  invoices: SupplierInvoice[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
