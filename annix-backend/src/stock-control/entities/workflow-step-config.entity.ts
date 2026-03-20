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

  @Column({ name: "is_background", type: "boolean", default: false })
  isBackground: boolean;

  @Column({ name: "trigger_after_step", type: "varchar", length: 50, nullable: true })
  triggerAfterStep: string | null;

  @Column({ name: "action_label", type: "varchar", length: 100, nullable: true })
  actionLabel: string | null;

  @Column({ name: "branch_color", type: "varchar", length: 20, nullable: true })
  branchColor: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
