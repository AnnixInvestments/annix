import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";
import { StockPurchaseBatch } from "./stock-purchase-batch.entity";

export type StockMovementKind =
  | "issuance"
  | "allocation"
  | "return_to_supplier"
  | "stock_take_write_off"
  | "wastage"
  | "damaged_hold"
  | "manual_adjustment";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

@Entity("sm_stock_movement_batch_consumption")
export class StockMovementBatchConsumption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @ManyToOne(() => StockPurchaseBatch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "purchase_batch_id" })
  purchaseBatch: StockPurchaseBatch;

  @Column({ name: "purchase_batch_id", type: "integer" })
  purchaseBatchId: number;

  @ManyToOne(() => IssuableProduct, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "product_id", type: "integer" })
  productId: number;

  @Column({ name: "movement_kind", type: "varchar", length: 32 })
  movementKind: StockMovementKind;

  @Column({ name: "movement_ref_id", type: "integer", nullable: true })
  movementRefId: number | null;

  @Column({
    name: "quantity_consumed",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  quantityConsumed: number;

  @Column({
    name: "cost_per_unit_at_consumption",
    type: "numeric",
    precision: 12,
    scale: 4,
    transformer: numericTransformer,
  })
  costPerUnitAtConsumption: number;

  @Column({
    name: "total_cost_consumed_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  totalCostConsumedR: number;

  @CreateDateColumn({ name: "consumed_at" })
  consumedAt: Date;

  @Column({ name: "consumed_by_staff_id", type: "integer", nullable: true })
  consumedByStaffId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
