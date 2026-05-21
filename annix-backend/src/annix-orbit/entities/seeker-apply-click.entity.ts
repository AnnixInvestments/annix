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

  @CreateDateColumn({ name: "clicked_at" })
  clickedAt: Date;
}
