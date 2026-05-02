import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";
import { CvAssistantCompany } from "./cv-assistant-company.entity";

export enum JobPostingStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  CLOSED = "closed",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  TEMPORARY = "temporary",
  INTERNSHIP = "internship",
  LEARNERSHIP = "learnership",
}

@Entity("cv_assistant_job_postings")
export class JobPosting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "required_skills", type: "jsonb", default: [] })
  requiredSkills: string[];

  @Column({ name: "min_experience_years", type: "int", nullable: true })
  minExperienceYears: number | null;

  @Column({ name: "required_education", type: "varchar", length: 255, nullable: true })
  requiredEducation: string | null;

  @Column({ name: "required_certifications", type: "jsonb", default: [] })
  requiredCertifications: string[];

  @Column({ name: "email_subject_pattern", type: "varchar", length: 255, nullable: true })
  emailSubjectPattern: string | null;

  @Column({ name: "auto_reject_enabled", type: "boolean", default: false })
  autoRejectEnabled: boolean;

  @Column({ name: "auto_reject_threshold", type: "int", default: 30 })
  autoRejectThreshold: number;

  @Column({ name: "auto_accept_threshold", type: "int", default: 80 })
  autoAcceptThreshold: number;

  @Column({ type: "varchar", length: 20, default: JobPostingStatus.DRAFT })
  status: JobPostingStatus;

  @Column({ name: "reference_number", type: "varchar", length: 20, nullable: true })
  referenceNumber: string | null;

  @Column({ name: "response_timeline_days", type: "int", default: 14 })
  responseTimelineDays: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  province: string | null;

  @Column({ name: "employment_type", type: "varchar", length: 30, nullable: true })
  employmentType: EmploymentType | null;

  @Column({ name: "salary_min", type: "int", nullable: true })
  salaryMin: number | null;

  @Column({ name: "salary_max", type: "int", nullable: true })
  salaryMax: number | null;

  @Column({ name: "salary_currency", type: "varchar", length: 3, default: "ZAR" })
  salaryCurrency: string;

  @Column({ name: "apply_by_email", type: "varchar", length: 255, nullable: true })
  applyByEmail: string | null;

  @Column({ name: "activated_at", type: "timestamptz", nullable: true })
  activatedAt: Date | null;

  @ManyToOne(() => CvAssistantCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CvAssistantCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => Candidate,
    (candidate) => candidate.jobPosting,
  )
  candidates: Candidate[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
