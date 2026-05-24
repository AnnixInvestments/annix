import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Audit log of every AI mentor answer (guardrail: grounded AI only — the mentor
 * reasons over curated DB rows captured in `groundingContext`, never free-form
 * facts). Logged for auditability and the "not a counselor" framing.
 */
@Entity("orbit_education_ai_advice_log")
@Index("idx_orbit_education_advice_profile", ["educationProfileId"])
export class EducationAiAdviceLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid", nullable: true })
  educationProfileId: string | null;

  @Column({ type: "text" })
  question: string;

  @Column({ type: "text" })
  answer: string;

  @Column({ name: "grounding_context", type: "jsonb", nullable: true })
  groundingContext: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  model: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
