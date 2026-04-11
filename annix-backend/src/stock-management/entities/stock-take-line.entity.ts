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
import { StockTake } from "./stock-take.entity";
import { StockTakeVarianceCategory } from "./stock-take-variance-category.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_stock_take_line")
export class StockTakeLine {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => StockTake,
    (take) => take.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "stock_take_id" })
  stockTake: StockTake;

  @Column({ name: "stock_take_id", type: "integer" })
  stockTakeId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @ManyToOne(() => IssuableProduct, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "product_id", type: "integer" })
  productId: number;

  @Column({ name: "location_id", type: "integer", nullable: true })
  locationId: number | null;

  @Column({
    name: "expected_qty",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  expectedQty: number;

  @Column({
    name: "expected_cost_per_unit",
    type: "numeric",
    precision: 12,
    scale: 4,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  expectedCostPerUnit: number;

  @Column({
    name: "expected_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  expectedValueR: number;

  @Column({
    name: "counted_qty",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  countedQty: number | null;

  @Column({ name: "counted_at", type: "timestamp", nullable: true })
  countedAt: Date | null;

  @Column({ name: "counted_by_staff_id", type: "integer", nullable: true })
  countedByStaffId: number | null;

  @Column({
    name: "expected_at_count_time",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  expectedAtCountTime: number | null;

  @Column({
    name: "expected_at_snapshot",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  expectedAtSnapshot: number | null;

  @Column({ name: "in_flight_movement_ids", type: "integer", array: true, nullable: true })
  inFlightMovementIds: number[] | null;

  @Column({
    name: "variance_qty",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  varianceQty: number | null;

  @Column({
    name: "variance_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  varianceValueR: number | null;

  @ManyToOne(() => StockTakeVarianceCategory, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "variance_category_id" })
  varianceCategory: StockTakeVarianceCategory | null;

  @Column({ name: "variance_category_id", type: "integer", nullable: true })
  varianceCategoryId: number | null;

  @Column({ name: "variance_reason", type: "text", nullable: true })
  varianceReason: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "resolved", type: "boolean", default: false })
  resolved: boolean;

  @Column({ name: "resolved_by_staff_id", type: "integer", nullable: true })
  resolvedByStaffId: number | null;

  @Column({ name: "resolved_at", type: "timestamp", nullable: true })
  resolvedAt: Date | null;

  @Column({ name: "resolution_notes", type: "text", nullable: true })
  resolutionNotes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
