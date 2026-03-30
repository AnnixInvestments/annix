import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { JobCard } from "./job-card.entity";
import { Requisition } from "./requisition.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum CalloffType {
  RUBBER = "rubber",
  PAINT = "paint",
  SOLUTION = "solution",
}

export enum CalloffStatus {
  PENDING = "pending",
  CALLED_OFF = "called_off",
  DELIVERED = "delivered",
  INVOICED = "invoiced",
}

@Entity("cpo_calloff_records")
@Unique("uq_calloff_company_cpo_jc_type", ["companyId", "cpoId", "jobCardId", "calloffType"])
export class CpoCalloffRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => CustomerPurchaseOrder, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cpo_id" })
  cpo: CustomerPurchaseOrder;

  @Column({ name: "cpo_id" })
  cpoId: number;

  @ManyToOne(() => JobCard, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @ManyToOne(() => Requisition, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "requisition_id" })
  requisition: Requisition | null;

  @Column({ name: "requisition_id", nullable: true })
  requisitionId: number | null;

  @Column({ name: "calloff_type", type: "varchar", length: 50 })
  calloffType: CalloffType;

  @Column({ type: "varchar", length: 50, default: CalloffStatus.PENDING })
  status: CalloffStatus;

  @Column({ name: "called_off_at", type: "timestamp", nullable: true })
  calledOffAt: Date | null;

  @Column({ name: "delivered_at", type: "timestamp", nullable: true })
  deliveredAt: Date | null;

  @Column({ name: "invoiced_at", type: "timestamp", nullable: true })
  invoicedAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
