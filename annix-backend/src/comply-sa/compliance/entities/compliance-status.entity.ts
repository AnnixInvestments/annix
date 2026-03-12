import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";
import { ComplySaComplianceRequirement } from "./compliance-requirement.entity";

@Entity("comply_sa_compliance_statuses")
export class ComplySaComplianceStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "requirement_id", type: "int" })
  requirementId!: number;

  @Column({ type: "varchar", length: 20, default: "in_progress" })
  status!: string;

  @Column({ name: "last_completed_date", type: "varchar", length: 50, nullable: true })
  lastCompletedDate!: string | null;

  @Column({ name: "next_due_date", type: "varchar", length: 50, nullable: true })
  nextDueDate!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "completed_by_user_id", type: "int", nullable: true })
  completedByUserId!: number | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(
    () => ComplySaCompany,
    (company) => company.complianceStatuses,
  )
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;

  @ManyToOne(() => ComplySaComplianceRequirement)
  @JoinColumn({ name: "requirement_id" })
  requirement!: ComplySaComplianceRequirement;
}
