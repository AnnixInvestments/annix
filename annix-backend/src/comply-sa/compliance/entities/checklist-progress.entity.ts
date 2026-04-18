import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { ComplySaComplianceRequirement } from "./compliance-requirement.entity";

@Entity("comply_sa_compliance_checklist_progress")
export class ComplySaChecklistProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "requirement_id", type: "int" })
  requirementId!: number;

  @Column({ name: "step_index", type: "int" })
  stepIndex!: number;

  @Column({ name: "step_label", type: "varchar", length: 500 })
  stepLabel!: string;

  @Column({ type: "boolean", default: false })
  completed!: boolean;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt!: Date | null;

  @Column({ name: "completed_by_user_id", type: "int", nullable: true })
  completedByUserId!: number | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: Company;

  @ManyToOne(() => ComplySaComplianceRequirement)
  @JoinColumn({ name: "requirement_id" })
  requirement!: ComplySaComplianceRequirement;
}
