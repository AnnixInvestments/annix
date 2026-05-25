import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("orbit_education_extraction_corrections")
@Index(["institutionId", "fieldKey"])
export class EducationExtractionCorrection {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "institution_id", type: "uuid", nullable: true })
  institutionId: string | null;

  @Column({ name: "field_key", type: "varchar", length: 120 })
  fieldKey: string;

  @Column({ name: "extracted_value", type: "jsonb" })
  extractedValue: Record<string, unknown>;

  @Column({ name: "corrected_value", type: "jsonb" })
  correctedValue: Record<string, unknown>;

  @Column({ name: "source_url", type: "varchar", length: 1000, nullable: true })
  sourceUrl: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
