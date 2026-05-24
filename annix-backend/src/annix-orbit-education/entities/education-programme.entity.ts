import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** A programme/degree a learner can be evaluated against (e.g. BSc Computer Science). */
@Entity("orbit_education_programmes")
@Index("idx_orbit_education_programmes_institution", ["institutionId"])
@Index("idx_orbit_education_programmes_faculty", ["facultyId"])
export class EducationProgramme {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "institution_id", type: "uuid" })
  institutionId: string;

  @Column({ name: "faculty_id", type: "uuid", nullable: true })
  facultyId: string | null;

  @Column({ type: "varchar", length: 64 })
  code: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  /** Career cluster (see @annix/product-data/orbit-education). */
  @Column({ name: "career_cluster", type: "varchar", length: 48, nullable: true })
  careerCluster: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
