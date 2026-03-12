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
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("workflow_step_configs")
@Unique(["companyId", "key"])
export class WorkflowStepConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 50 })
  key: string;

  @Column({ type: "varchar", length: 100 })
  label: string;

  @Column({ name: "sort_order", type: "int" })
  sortOrder: number;

  @Column({ name: "is_system", type: "boolean", default: true })
  isSystem: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
