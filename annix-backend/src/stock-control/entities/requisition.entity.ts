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
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { JobCard } from "./job-card.entity";
import { RequisitionItem } from "./requisition-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum RequisitionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  ORDERED = "ordered",
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received",
  CANCELLED = "cancelled",
}

export enum RequisitionSource {
  JOB_CARD = "job_card",
  REORDER = "reorder",
  CPO = "cpo",
}

@Entity("requisitions")
export class Requisition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "requisition_number", type: "varchar", length: 100 })
  requisitionNumber: string;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ type: "varchar", length: 20, default: RequisitionSource.JOB_CARD })
  source: RequisitionSource;

  @Column({ type: "varchar", length: 50, default: RequisitionStatus.PENDING })
  status: RequisitionStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
  createdBy: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => CustomerPurchaseOrder, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "cpo_id" })
  cpo: CustomerPurchaseOrder | null;

  @Column({ name: "cpo_id", nullable: true })
  cpoId: number | null;

  @Column({ name: "is_calloff_order", type: "boolean", default: false })
  isCalloffOrder: boolean;

  @OneToMany(
    () => RequisitionItem,
    (item) => item.requisition,
  )
  items: RequisitionItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
