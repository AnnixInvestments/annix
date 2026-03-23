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

export enum ReconciliationSourceType {
  CPO = "cpo",
  JT_DN = "jt_dn",
  MANUAL = "manual",
}

export enum ReconciliationStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  COMPLETE = "complete",
  DISCREPANCY = "discrepancy",
}

@Entity("reconciliation_items")
export class ReconciliationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "item_description", type: "text" })
  itemDescription: string;

  @Column({ name: "item_code", type: "varchar", length: 500, nullable: true })
  itemCode: string | null;

  @Column({ name: "source_document_id", nullable: true })
  sourceDocumentId: number | null;

  @Column({ name: "source_type", type: "varchar", length: 20 })
  sourceType: ReconciliationSourceType;

  @Column({ name: "quantity_ordered", type: "numeric", precision: 12, scale: 2 })
  quantityOrdered: number;

  @Column({ name: "quantity_released", type: "numeric", precision: 12, scale: 2, default: 0 })
  quantityReleased: number;

  @Column({ name: "quantity_shipped", type: "numeric", precision: 12, scale: 2, default: 0 })
  quantityShipped: number;

  @Column({ name: "quantity_mps", type: "numeric", precision: 12, scale: 2, default: 0 })
  quantityMps: number;

  @Column({
    name: "reconciliation_status",
    type: "varchar",
    length: 20,
    default: ReconciliationStatus.PENDING,
  })
  reconciliationStatus: ReconciliationStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
