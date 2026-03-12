import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("comply_sa_compliance_requirements")
export class ComplySaComplianceRequirement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 100 })
  regulator!: string;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "applicable_conditions", type: "jsonb", nullable: true })
  applicableConditions!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 20 })
  frequency!: string;

  @Column({ name: "deadline_rule", type: "jsonb", nullable: true })
  deadlineRule!: Record<string, unknown> | null;

  @Column({ name: "penalty_description", type: "text", nullable: true })
  penaltyDescription!: string | null;

  @Column({ name: "guidance_url", type: "varchar", length: 500, nullable: true })
  guidanceUrl!: string | null;

  @Column({ name: "required_documents", type: "jsonb", nullable: true })
  requiredDocuments!: string[] | null;

  @Column({ name: "checklist_steps", type: "jsonb", nullable: true })
  checklistSteps!: string[] | null;

  @Column({ type: "int", default: 1 })
  tier!: number;
}
