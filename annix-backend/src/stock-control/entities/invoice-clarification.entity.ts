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
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

export enum ClarificationType {
  ITEM_MATCH = "item_match",
  PRICE_CONFIRMATION = "price_confirmation",
  NEW_ITEM = "new_item",
  PART_LINKING = "part_linking",
}

export enum ClarificationStatus {
  PENDING = "pending",
  ANSWERED = "answered",
  SKIPPED = "skipped",
}

export interface ClarificationContext {
  suggestedMatches?: SuggestedMatch[];
  priceChangePercent?: number;
  oldPrice?: number;
  newPrice?: number;
  extractedDescription?: string;
  extractedSku?: string;
  isPartA?: boolean;
  isPartB?: boolean;
  potentialLinkedItem?: {
    id: number;
    description: string;
    isPartA: boolean;
  };
}

export interface SuggestedMatch {
  stockItemId: number;
  stockItemName: string;
  stockItemSku: string;
  confidence: number;
  currentPrice: number;
}

@Entity("invoice_clarifications")
export class InvoiceClarification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.clarifications, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_id" })
  invoice: SupplierInvoice;

  @Column({ name: "invoice_id" })
  invoiceId: number;

  @ManyToOne(() => SupplierInvoiceItem, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_item_id" })
  invoiceItem: SupplierInvoiceItem | null;

  @Column({ name: "invoice_item_id", nullable: true })
  invoiceItemId: number | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "clarification_type", type: "varchar", length: 50 })
  clarificationType: ClarificationType;

  @Column({ type: "varchar", length: 50, default: ClarificationStatus.PENDING })
  status: ClarificationStatus;

  @Column({ type: "text" })
  question: string;

  @Column({ type: "jsonb", nullable: true })
  context: ClarificationContext | null;

  @ManyToOne(() => StockItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "selected_stock_item_id" })
  selectedStockItem: StockItem | null;

  @Column({ name: "selected_stock_item_id", nullable: true })
  selectedStockItemId: number | null;

  @Column({ name: "response_data", type: "jsonb", nullable: true })
  responseData: Record<string, unknown> | null;

  @ManyToOne(() => StockControlUser, { nullable: true })
  @JoinColumn({ name: "answered_by" })
  answeredByUser: StockControlUser | null;

  @Column({ name: "answered_by", nullable: true })
  answeredBy: number | null;

  @Column({ name: "answered_at", type: "timestamp", nullable: true })
  answeredAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
