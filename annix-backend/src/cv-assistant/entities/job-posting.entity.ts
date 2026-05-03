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
import { JobScreeningQuestion } from "./job-screening-question.entity";
import { JobSkill } from "./job-skill.entity";
import { JobSuccessMetric } from "./job-success-metric.entity";

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

export enum WorkMode {
  ON_SITE = "on_site",
  HYBRID = "hybrid",
  REMOTE = "remote",
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

  @Column({ name: "enabled_portal_codes", type: "jsonb", default: [] })
  enabledPortalCodes: string[];

  @Column({ name: "test_mode", type: "boolean", default: false })
  testMode: boolean;

  @Column({ name: "normalized_title", type: "text", nullable: true })
  normalizedTitle: string | null;

  @Column({ type: "text", nullable: true })
  industry: string | null;

  @Column({ type: "text", nullable: true })
  department: string | null;

  @Column({ name: "seniority_level", type: "text", nullable: true })
  seniorityLevel: string | null;

  @Column({ name: "work_mode", type: "text", nullable: true })
  workMode: WorkMode | null;

  @Column({ name: "company_context", type: "text", nullable: true })
  companyContext: string | null;

  @Column({ name: "main_purpose", type: "text", nullable: true })
  mainPurpose: string | null;

  @Column({ name: "commission_structure", type: "text", nullable: true })
  commissionStructure: string | null;

  @Column({ type: "jsonb", default: [] })
  benefits: string[];

  @Column({ name: "quality_score", type: "int", default: 0 })
  qualityScore: number;

  @Column({ name: "inclusivity_score", type: "int", default: 0 })
  inclusivityScore: number;

  @Column({ name: "nix_summary", type: "jsonb", nullable: true })
  nixSummary: Record<string, unknown> | null;

  @OneToMany(
    () => JobSkill,
    (skill) => skill.jobPosting,
  )
  skills: JobSkill[];

  @OneToMany(
    () => JobSuccessMetric,
    (metric) => metric.jobPosting,
  )
  successMetrics: JobSuccessMetric[];

  @OneToMany(
    () => JobScreeningQuestion,
    (question) => question.jobPosting,
  )
  screeningQuestions: JobScreeningQuestion[];

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
