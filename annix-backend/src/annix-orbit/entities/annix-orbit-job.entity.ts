import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_JOB_STATUSES = [
  "open",
  "sourcing",
  "interviewing",
  "offer",
  "filled",
  "on_hold",
  "closed",
] as const;
export type AnnixOrbitJobStatus = (typeof ORBIT_JOB_STATUSES)[number];

@Entity("orbit_jobs")
@Index(["companyId"])
export class AnnixOrbitJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ name: "employment_type", type: "varchar", length: 50, nullable: true })
  employmentType: string | null;

  @Column({ name: "salary_min", type: "numeric", nullable: true })
  salaryMin: number | null;

  @Column({ name: "salary_max", type: "numeric", nullable: true })
  salaryMax: number | null;

  @Column({ name: "required_skills", type: "jsonb", nullable: true })
  requiredSkills: string[] | null;

  // Gemini embedding over title/description/skills, refreshed in the
  // background on create/update (issue #337 embedding matching).
  @Column({ type: "jsonb", nullable: true })
  embedding: number[] | null;

  @Column({ type: "int", default: 1 })
  openings: number;

  @Column({ type: "varchar", length: 20, default: "open" })
  status: AnnixOrbitJobStatus;

  @Column({ name: "closing_date", type: "varchar", length: 20, nullable: true })
  closingDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
