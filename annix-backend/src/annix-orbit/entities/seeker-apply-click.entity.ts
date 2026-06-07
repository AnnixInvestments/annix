import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("cv_assistant_seeker_apply_clicks")
@Index("idx_seeker_apply_clicks_candidate_clicked_at", ["candidateId", "clickedAt"])
@Index("idx_seeker_apply_clicks_external_job_clicked_at", ["externalJobId", "clickedAt"])
export class SeekerApplyClick {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "external_job_id", type: "int", nullable: true })
  externalJobId: number | null;

  @Column({ name: "match_id", type: "int", nullable: true })
  matchId: number | null;

  @Column({ name: "source_url", type: "varchar", length: 1000, nullable: true })
  sourceUrl: string | null;

  @Column({ name: "status", type: "varchar", length: 32, nullable: true })
  status: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "dismissed", type: "boolean", default: false })
  dismissed: boolean;

  // Snapshot of the job at apply time so the application stays meaningful even
  // after the external job is pruned / re-ingested / delisted off the board.
  @Column({ name: "job_title", type: "varchar", length: 500, nullable: true })
  jobTitle: string | null;

  @Column({ name: "job_company", type: "varchar", length: 500, nullable: true })
  jobCompany: string | null;

  @Column({ name: "job_location", type: "varchar", length: 500, nullable: true })
  jobLocation: string | null;

  @Column({ name: "job_salary_min", type: "int", nullable: true })
  jobSalaryMin: number | null;

  @Column({ name: "job_salary_max", type: "int", nullable: true })
  jobSalaryMax: number | null;

  @Column({ name: "job_salary_currency", type: "varchar", length: 8, nullable: true })
  jobSalaryCurrency: string | null;

  @CreateDateColumn({ name: "clicked_at" })
  clickedAt: Date;
}
