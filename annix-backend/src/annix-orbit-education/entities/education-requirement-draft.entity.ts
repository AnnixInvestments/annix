import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type RequirementDraftStatus = "draft" | "approved" | "rejected" | "changed";

@Entity("orbit_education_requirement_drafts")
@Index(["programmeId", "intakeYear"])
export class EducationRequirementDraft {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "institution_id", type: "uuid", nullable: true })
  institutionId: string | null;

  @Column({ name: "programme_id", type: "uuid", nullable: true })
  programmeId: string | null;

  @Column({ name: "intake_year", type: "integer" })
  intakeYear: number;

  @Column({ name: "field_key", type: "varchar", length: 120 })
  fieldKey: string;

  @Column({ name: "label", type: "varchar", length: 255, default: "" })
  label: string;

  @Column({ name: "extracted_value", type: "jsonb" })
  extractedValue: Record<string, unknown>;

  @Column({ name: "approved_value", type: "jsonb", nullable: true })
  approvedValue: Record<string, unknown> | null;

  @Column({ name: "status", type: "varchar", length: 16, default: "draft" })
  status: RequirementDraftStatus;

  @Column({ name: "confidence", type: "varchar", length: 16, nullable: true })
  confidence: string | null;

  @Column({ name: "source_url", type: "varchar", length: 1000 })
  sourceUrl: string;

  @Column({ name: "screenshot_path", type: "varchar", length: 1000, nullable: true })
  screenshotPath: string | null;

  @Column({ name: "raw_snippet", type: "text", nullable: true })
  rawSnippet: string | null;

  @Column({ name: "fetched_at", type: "timestamptz" })
  fetchedAt: Date;

  @Column({ name: "approved_by_id", type: "integer", nullable: true })
  approvedById: number | null;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
