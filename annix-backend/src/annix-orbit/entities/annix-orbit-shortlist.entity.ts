import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_SHORTLIST_STATUSES = ["draft", "ready", "sent", "reviewed", "closed"] as const;
export type AnnixOrbitShortlistStatus = (typeof ORBIT_SHORTLIST_STATUSES)[number];

@Entity("orbit_shortlists")
@Index(["companyId"])
export class AnnixOrbitShortlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "job_title", type: "varchar", length: 255, nullable: true })
  jobTitle: string | null;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ name: "candidate_ids", type: "jsonb", nullable: true })
  candidateIds: number[] | null;

  @Column({ type: "varchar", length: 20, default: "draft" })
  status: AnnixOrbitShortlistStatus;

  // Tokenised read-only client view (issue #337). Null = no live share link.
  @Column({ name: "share_token", type: "varchar", length: 64, nullable: true })
  shareToken: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
