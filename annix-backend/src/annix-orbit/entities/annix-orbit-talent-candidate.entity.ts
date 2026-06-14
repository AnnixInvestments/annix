import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_CANDIDATE_VISIBILITIES = ["private", "agency", "public"] as const;
export type AnnixOrbitCandidateVisibility = (typeof ORBIT_CANDIDATE_VISIBILITIES)[number];

export const ORBIT_CANDIDATE_STATUSES = ["active", "placed", "do_not_contact", "archived"] as const;
export type AnnixOrbitTalentCandidateStatus = (typeof ORBIT_CANDIDATE_STATUSES)[number];

// Canonical recruiter pipeline stage the candidate sits at (issue #362).
// Only identified/screened/shortlisted are set manually; submitted+ are
// derived from submissions/placements (see recruiter-pipeline.ts).
export const ORBIT_PIPELINE_STAGES = [
  "identified",
  "screened",
  "shortlisted",
  "submitted",
  "interview",
  "offer",
  "placed",
] as const;
export type OrbitPipelineStage = (typeof ORBIT_PIPELINE_STAGES)[number];

// Where the candidate came into the pool — powers the dashboard source
// breakdown donut.
export const ORBIT_CANDIDATE_SOURCES = [
  "database",
  "referral",
  "website",
  "social",
  "job_board",
  "other",
] as const;
export type AnnixOrbitCandidateSource = (typeof ORBIT_CANDIDATE_SOURCES)[number];

@Entity("orbit_talent_candidates")
@Index(["companyId"])
export class AnnixOrbitTalentCandidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "owner_user_id" })
  ownerUserId: number;

  @Column({ type: "varchar", length: 20, default: "agency" })
  visibility: AnnixOrbitCandidateVisibility;

  @Column({ name: "full_name", type: "varchar", length: 255 })
  fullName: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone: string | null;

  @Column({ name: "current_role", type: "varchar", length: 255, nullable: true })
  currentRole: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  province: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @Column({ name: "years_experience", type: "int", nullable: true })
  yearsExperience: number | null;

  @Column({ type: "jsonb", nullable: true })
  skills: string[] | null;

  @Column({ name: "salary_expectation", type: "numeric", nullable: true })
  salaryExpectation: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  availability: string | null;

  @Column({ name: "notice_period", type: "varchar", length: 100, nullable: true })
  noticePeriod: string | null;

  @Column({ name: "willing_to_relocate", type: "boolean", default: false })
  willingToRelocate: boolean;

  @Column({ type: "varchar", length: 20, default: "active" })
  status: AnnixOrbitTalentCandidateStatus;

  @Column({ name: "pipeline_stage", type: "varchar", length: 20, default: "identified" })
  pipelineStage: OrbitPipelineStage;

  @Column({ type: "varchar", length: 20, default: "database" })
  source: AnnixOrbitCandidateSource;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  // Raw CV text + stored file (issue #337: CV upload used to parse-and-discard).
  @Column({ name: "cv_text", type: "text", nullable: true })
  cvText: string | null;

  @Column({ name: "cv_file_path", type: "varchar", length: 500, nullable: true })
  cvFilePath: string | null;

  // Gemini embedding over the candidate's profile + CV text, refreshed in the
  // background whenever the profile changes (issue #337 embedding matching).
  @Column({ type: "jsonb", nullable: true })
  embedding: number[] | null;

  @Column({ name: "consent_to_share", type: "boolean", default: false })
  consentToShare: boolean;

  @Column({ name: "consent_given_at", type: "varchar", length: 30, nullable: true })
  consentGivenAt: string | null;

  @Column({ name: "consent_source", type: "varchar", length: 100, nullable: true })
  consentSource: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
