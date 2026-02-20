import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
