import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("cv_assistant_seeker_interview_reminders")
@Index("idx_seeker_interview_reminders_lookup", ["source", "sourceId", "offset"])
export class SeekerInterviewReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "source", type: "varchar", length: 16 })
  source: string;

  @Column({ name: "source_id", type: "int" })
  sourceId: number;

  @Column({ name: "offset", type: "varchar", length: 8 })
  offset: string;

  @CreateDateColumn({ name: "sent_at" })
  sentAt: Date;
}
