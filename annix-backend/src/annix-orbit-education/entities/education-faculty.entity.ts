import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A faculty within an institution. Holds an optional faculty-level default
 * requirement spec — the middle tier of the programme → faculty → institution
 * policy-inheritance chain (mirrors UCT faculty-specific FPS variants).
 */
@Entity("orbit_education_faculties")
@Index("idx_orbit_education_faculties_institution", ["institutionId"])
export class EducationFaculty {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "institution_id", type: "uuid" })
  institutionId: string;

  @Column({ type: "varchar", length: 64 })
  code: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "default_requirement_spec", type: "jsonb", nullable: true })
  defaultRequirementSpec: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
