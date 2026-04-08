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
import { RubberRollStock } from "./rubber-roll-stock.entity";

export enum RollIssuanceStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

@Entity("rubber_roll_issuances")
export class RubberRollIssuance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "roll_stock_id", type: "int" })
  rollStockId: number;

  @ManyToOne(() => RubberRollStock, { nullable: false })
  @JoinColumn({ name: "roll_stock_id" })
  rollStock: RubberRollStock;

  @Column({ name: "issued_by", type: "varchar", length: 200 })
  issuedBy: string;

  @Column({ name: "issued_at", type: "timestamptz" })
  issuedAt: Date;

  @Column({
    name: "roll_weight_at_issue_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
  })
  rollWeightAtIssueKg: number;

  @Column({
    name: "total_estimated_usage_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  totalEstimatedUsageKg: number | null;

  @Column({
    name: "expected_return_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  expectedReturnKg: number | null;

  @Column({ name: "photo_path", type: "varchar", length: 500, nullable: true })
  photoPath: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({
    type: "enum",
    enum: RollIssuanceStatus,
    default: RollIssuanceStatus.ACTIVE,
  })
  status: RollIssuanceStatus;

  @OneToMany(
    () => RubberRollIssuanceItem,
    (item) => item.issuance,
  )
  items: RubberRollIssuanceItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

@Entity("rubber_roll_issuance_items")
export class RubberRollIssuanceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "issuance_id", type: "int" })
  issuanceId: number;

  @ManyToOne(
    () => RubberRollIssuance,
    (issuance) => issuance.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "issuance_id" })
  issuance: RubberRollIssuance;

  @Column({ name: "job_card_id", type: "int" })
  jobCardId: number;

  @Column({ name: "jc_number", type: "varchar", length: 500 })
  jcNumber: string;

  @Column({ name: "job_name", type: "varchar", length: 255, nullable: true })
  jobName: string | null;

  @OneToMany(
    () => RubberRollIssuanceLineItem,
    (li) => li.issuanceItem,
  )
  lineItems: RubberRollIssuanceLineItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

@Entity("rubber_roll_issuance_line_items")
export class RubberRollIssuanceLineItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "issuance_item_id", type: "int" })
  issuanceItemId: number;

  @ManyToOne(
    () => RubberRollIssuanceItem,
    (item) => item.lineItems,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "issuance_item_id" })
  issuanceItem: RubberRollIssuanceItem;

  @Column({ name: "line_item_id", type: "int" })
  lineItemId: number;

  @Column({ name: "item_description", type: "text", nullable: true })
  itemDescription: string | null;

  @Column({ name: "item_no", type: "varchar", length: 500, nullable: true })
  itemNo: string | null;

  @Column({ type: "int", nullable: true })
  quantity: number | null;

  @Column({
    name: "m2",
    type: "decimal",
    precision: 12,
    scale: 4,
    nullable: true,
  })
  m2: number | null;

  @Column({
    name: "estimated_weight_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  estimatedWeightKg: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
