import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("qc_environmental_batch_links")
export class QcEnvironmentalBatchLink {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "batch_assignment_id" })
  batchAssignmentId: number;

  @Column({ name: "environmental_record_id" })
  environmentalRecordId: number;

  @Column({ name: "activity_date", type: "date" })
  activityDate: Date;

  @Column({ name: "pull_rule", type: "varchar", length: 20 })
  pullRule: string;

  @Column({ name: "resolved_date", type: "date" })
  resolvedDate: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
