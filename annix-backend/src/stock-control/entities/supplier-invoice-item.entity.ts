import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";

export enum InvoiceItemMatchStatus {
  MATCHED = "matched",
  UNMATCHED = "unmatched",
  CLARIFICATION_NEEDED = "clarification_needed",
  MANUALLY_MATCHED = "manually_matched",
  NEW_ITEM_CREATED = "new_item_created",
}

@Entity("supplier_invoice_items")
export class SupplierInvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => SupplierInvoice,
    (invoice) => invoice.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "invoice_id" })
  invoice: SupplierInvoice;

  @Column({ name: "invoice_id" })
  invoiceId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "line_number", type: "integer" })
  lineNumber: number;

  @Column({ name: "extracted_description", type: "text", nullable: true })
  extractedDescription: string | null;

  @Column({ name: "extracted_sku", type: "varchar", length: 255, nullable: true })
  extractedSku: string | null;

  @Column({ type: "integer", default: 1 })
  quantity: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2, nullable: true })
  unitPrice: number | null;

  @Column({
    name: "match_status",
    type: "varchar",
    length: 50,
    default: InvoiceItemMatchStatus.UNMATCHED,
  })
  matchStatus: InvoiceItemMatchStatus;

  @Column({ name: "match_confidence", type: "numeric", precision: 5, scale: 2, nullable: true })
  matchConfidence: number | null;

  @ManyToOne(() => StockItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem | null;

  @Column({ name: "stock_item_id", nullable: true })
  stockItemId: number | null;

  @Column({ name: "is_part_a", type: "boolean", default: false })
  isPartA: boolean;

  @Column({ name: "is_part_b", type: "boolean", default: false })
  isPartB: boolean;

  @ManyToOne(() => SupplierInvoiceItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "linked_item_id" })
  linkedItem: SupplierInvoiceItem | null;

  @Column({ name: "linked_item_id", nullable: true })
  linkedItemId: number | null;

  @Column({ name: "price_updated", type: "boolean", default: false })
  priceUpdated: boolean;

  @Column({ name: "previous_price", type: "numeric", precision: 12, scale: 2, nullable: true })
  previousPrice: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
