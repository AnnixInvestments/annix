import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A curated institution in the FuturePath admissions catalog (#308). Holds an
 * optional institution-level default requirement spec used as the last fallback
 * in the programme → faculty → institution policy-inheritance chain.
 */
@Entity("orbit_education_institutions")
@Index("idx_orbit_education_institutions_code", ["code"], { unique: true })
export class EducationInstitution {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 64 })
  code: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  country: string | null;

  /** Institution-level default RequirementSpec (jsonb) — fallback in the inheritance chain. */
  @Column({ name: "default_requirement_spec", type: "jsonb", nullable: true })
  defaultRequirementSpec: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
