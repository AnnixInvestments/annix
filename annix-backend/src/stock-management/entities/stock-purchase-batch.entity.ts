import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

export type StockPurchaseBatchSourceType =
  | "supplier_invoice"
  | "grn"
  | "manual_adjustment"
  | "stock_take_overage"
  | "customer_return"
  | "legacy";

export type StockPurchaseBatchStatus = "active" | "exhausted" | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

@Entity("sm_stock_purchase_batch")
export class StockPurchaseBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @ManyToOne(() => IssuableProduct, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "product_id", type: "integer" })
  productId: number;

  @Column({ name: "source_type", type: "varchar", length: 32 })
  sourceType: StockPurchaseBatchSourceType;

  @Column({ name: "source_ref_id", type: "integer", nullable: true })
  sourceRefId: number | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "supplier_batch_ref", type: "varchar", length: 100, nullable: true })
  supplierBatchRef: string | null;

  @Column({
    name: "quantity_purchased",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  quantityPurchased: number;

  @Column({
    name: "quantity_remaining",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  quantityRemaining: number;

  @Column({
    name: "cost_per_unit",
    type: "numeric",
    precision: 12,
    scale: 4,
    transformer: numericTransformer,
  })
  costPerUnit: number;

  @Column({
    name: "total_cost_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  totalCostR: number;

  @Column({ name: "received_at", type: "timestamp" })
  receivedAt: Date;

  @Column({ name: "status", type: "varchar", length: 32, default: "active" })
  status: StockPurchaseBatchStatus;

  @Column({ name: "is_legacy_batch", type: "boolean", default: false })
  isLegacyBatch: boolean;

  @Column({ name: "created_by_staff_id", type: "integer", nullable: true })
  createdByStaffId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
