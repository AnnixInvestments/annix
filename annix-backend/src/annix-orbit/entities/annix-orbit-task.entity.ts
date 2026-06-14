import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// Minimal recruiter task list (issue #362 phase 6) — powers the
// dashboard Tasks card ("N due today") and the Tasks page.
@Entity("orbit_tasks")
@Index(["companyId"])
export class AnnixOrbitTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "owner_user_id" })
  ownerUserId: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ name: "due_date", type: "date", nullable: true })
  dueDate: string | null;

  @Column({ type: "boolean", default: false })
  done: boolean;

  @Column({ name: "related_candidate_id", type: "int", nullable: true })
  relatedCandidateId: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
