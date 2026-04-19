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
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("workflow_step_assignments")
@Unique(["companyId", "workflowStep", "userId"])
export class WorkflowStepAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "workflow_step", type: "varchar", length: 50 })
  workflowStep: string;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "is_primary", type: "boolean", default: false })
  isPrimary: boolean;

  @ManyToOne(() => StockControlUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "secondary_user_id" })
  secondaryUser: StockControlUser | null;

  @Column({ name: "secondary_user_id", nullable: true })
  secondaryUserId: number | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_secondary_user_id" })
  unifiedSecondaryUser?: User | null;

  @Column({ name: "unified_secondary_user_id", nullable: true })
  unifiedSecondaryUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
