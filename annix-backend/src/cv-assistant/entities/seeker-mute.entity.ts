import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("cv_assistant_seeker_mutes")
@Index("idx_seeker_mutes_candidate", ["candidateId"])
export class SeekerMute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "company_name", type: "varchar", length: 500, nullable: true })
  companyName: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  category: string | null;

  @CreateDateColumn({ name: "muted_at" })
  mutedAt: Date;
}
