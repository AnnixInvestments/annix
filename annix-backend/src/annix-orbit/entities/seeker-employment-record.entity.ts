import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_seeker_employment_records")
@Index("idx_seeker_employment_candidate_status", ["candidateId", "status"])
export class SeekerEmploymentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "apply_click_id", type: "int", nullable: true })
  applyClickId: number | null;

  @Column({ name: "external_job_id", type: "int", nullable: true })
  externalJobId: number | null;

  @Column({ name: "employer_name", type: "varchar", length: 300 })
  employerName: string;

  @Column({ name: "company_website_url", type: "varchar", length: 1000, nullable: true })
  companyWebsiteUrl: string | null;

  @Column({ name: "role_title", type: "varchar", length: 300 })
  roleTitle: string;

  @Column({ name: "role_outline", type: "text", nullable: true })
  roleOutline: string | null;

  @Column({ name: "start_date", type: "timestamptz", nullable: true })
  startDate: Date | null;

  @Column({ name: "end_date", type: "timestamptz", nullable: true })
  endDate: Date | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "active" })
  status: string;

  @Column({ name: "research_status", type: "varchar", length: 20, default: "pending" })
  researchStatus: string;

  @Column({ name: "researched_at", type: "timestamptz", nullable: true })
  researchedAt: Date | null;

  @Column({ name: "applied_to_cv_at", type: "timestamptz", nullable: true })
  appliedToCvAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
