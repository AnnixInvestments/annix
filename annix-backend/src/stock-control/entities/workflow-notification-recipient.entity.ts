import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { WorkflowStep } from "./job-card-approval.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("workflow_notification_recipients")
@Unique(["companyId", "workflowStep", "email"])
export class WorkflowNotificationRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "workflow_step", type: "varchar", length: 50 })
  workflowStep: WorkflowStep;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
