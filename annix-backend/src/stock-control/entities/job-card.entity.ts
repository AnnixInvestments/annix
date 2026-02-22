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
import { JobCardLineItem } from "./job-card-line-item.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum JobCardStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("job_cards")
export class JobCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "job_number", type: "varchar", length: 100 })
  jobNumber: string;

  @Column({ name: "job_name", type: "varchar", length: 255 })
  jobName: string;

  @Column({ name: "customer_name", type: "varchar", length: 255, nullable: true })
  customerName: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "po_number", type: "varchar", length: 100, nullable: true })
  poNumber: string | null;

  @Column({ name: "site_location", type: "varchar", length: 255, nullable: true })
  siteLocation: string | null;

  @Column({ name: "contact_person", type: "varchar", length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ name: "due_date", type: "varchar", length: 100, nullable: true })
  dueDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference: string | null;

  @Column({ name: "custom_fields", type: "jsonb", nullable: true })
  customFields: Record<string, string> | null;

  @Column({ type: "varchar", length: 50, default: JobCardStatus.DRAFT })
  status: JobCardStatus;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => StockAllocation,
    (allocation) => allocation.jobCard,
  )
  allocations: StockAllocation[];

  @OneToMany(
    () => JobCardLineItem,
    (li) => li.jobCard,
  )
  lineItems: JobCardLineItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
