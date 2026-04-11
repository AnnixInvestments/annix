import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockPurchaseBatch } from "./stock-purchase-batch.entity";
import { StockTakeLine } from "./stock-take-line.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity("sm_stock_take_adjustment")
export class StockTakeAdjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockTakeLine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_take_line_id" })
  stockTakeLine: StockTakeLine;

  @Column({ name: "stock_take_line_id", type: "integer" })
  stockTakeLineId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({
    name: "adjustment_qty",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  adjustmentQty: number;

  @Column({
    name: "adjustment_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  adjustmentValueR: number;

  @ManyToOne(() => StockPurchaseBatch, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "purchase_batch_id" })
  purchaseBatch: StockPurchaseBatch | null;

  @Column({ name: "purchase_batch_id", type: "integer", nullable: true })
  purchaseBatchId: number | null;

  @CreateDateColumn({ name: "posted_at" })
  postedAt: Date;

  @Column({ name: "posted_by_staff_id", type: "integer", nullable: true })
  postedByStaffId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
