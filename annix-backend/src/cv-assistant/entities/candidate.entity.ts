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
import { CandidateReference } from "./candidate-reference.entity";
import { JobPosting } from "./job-posting.entity";

export enum CandidateStatus {
  NEW = "new",
  SCREENING = "screening",
  REJECTED = "rejected",
  SHORTLISTED = "shortlisted",
  REFERENCE_CHECK = "reference_check",
  ACCEPTED = "accepted",
}

export interface ExtractedCvData {
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  education: string[];
  certifications: string[];
  references: Array<{
    name: string;
    email: string;
    relationship: string | null;
  }>;
  summary: string | null;
}

export interface MatchAnalysis {
  overallScore: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: boolean;
  educationMatch: boolean;
  recommendation: "reject" | "review" | "shortlist";
  reasoning: string | null;
}

@Entity("cv_assistant_candidates")
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @Column({ name: "cv_file_path", type: "varchar", length: 500, nullable: true })
  cvFilePath: string | null;

  @Column({ name: "raw_cv_text", type: "text", nullable: true })
  rawCvText: string | null;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedCvData | null;

  @Column({ name: "match_analysis", type: "jsonb", nullable: true })
  matchAnalysis: MatchAnalysis | null;

  @Column({ name: "match_score", type: "int", nullable: true })
  matchScore: number | null;

  @Column({ type: "varchar", length: 30, default: CandidateStatus.NEW })
  status: CandidateStatus;

  @Column({ name: "source_email_id", type: "varchar", length: 255, nullable: true })
  sourceEmailId: string | null;

  @Column({ name: "rejection_sent_at", type: "timestamptz", nullable: true })
  rejectionSentAt: Date | null;

  @Column({ name: "acceptance_sent_at", type: "timestamptz", nullable: true })
  acceptanceSentAt: Date | null;

  @ManyToOne(
    () => JobPosting,
    (jobPosting) => jobPosting.candidates,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @OneToMany(
    () => CandidateReference,
    (reference) => reference.candidate,
  )
  references: CandidateReference[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
