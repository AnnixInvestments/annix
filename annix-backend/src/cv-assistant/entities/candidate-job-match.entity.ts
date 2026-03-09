import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";
import { ExternalJob } from "./external-job.entity";

export interface MatchDetails {
  embeddingSimilarity: number;
  skillsOverlap: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: number;
  locationMatch: number;
  reasoning: string;
}

@Entity("cv_assistant_candidate_job_matches")
@Index("idx_candidate_job_match_candidate", ["candidateId"])
@Index("idx_candidate_job_match_job", ["externalJobId"])
@Index("idx_candidate_job_match_score", ["overallScore"])
export class CandidateJobMatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Candidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate: Candidate;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @ManyToOne(() => ExternalJob, { onDelete: "CASCADE" })
  @JoinColumn({ name: "external_job_id" })
  externalJob: ExternalJob;

  @Column({ name: "external_job_id" })
  externalJobId: number;

  @Column({ name: "similarity_score", type: "decimal", precision: 5, scale: 4, default: 0 })
  similarityScore: number;

  @Column({ name: "structured_score", type: "decimal", precision: 5, scale: 4, default: 0 })
  structuredScore: number;

  @Column({ name: "overall_score", type: "decimal", precision: 5, scale: 4, default: 0 })
  overallScore: number;

  @Column({ name: "match_details", type: "jsonb", nullable: true })
  matchDetails: MatchDetails | null;

  @Column({ type: "boolean", default: false })
  dismissed: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
