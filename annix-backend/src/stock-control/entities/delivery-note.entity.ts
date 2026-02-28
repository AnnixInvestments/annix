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
import { SupplierInvoice } from "./supplier-invoice.entity";

export interface ExtractedDeliveryData {
  deliveryNumber?: string;
  supplierName?: string;
  receivedDate?: string;
  lineItems?: { description: string; quantity: number; sku?: string }[];
  rawText?: string;
}

@Entity("delivery_notes")
export class DeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "delivery_number", type: "varchar", length: 100 })
  deliveryNumber: string;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

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

  @Column({ name: "extraction_status", type: "varchar", length: 50, nullable: true })
  extractionStatus: string | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedDeliveryData | null;

  @OneToMany(() => SupplierInvoice, (invoice) => invoice.deliveryNote)
  invoices: SupplierInvoice[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
