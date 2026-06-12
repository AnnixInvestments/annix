import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_AUDIT_ACTIONS = [
  "candidate_submitted",
  "shortlist_sent",
  "consent_given",
  "consent_withdrawn",
] as const;
export type AnnixOrbitAuditAction = (typeof ORBIT_AUDIT_ACTIONS)[number];

@Entity("orbit_audit_events")
@Index(["companyId", "candidateId"])
export class AnnixOrbitAuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "actor_user_id" })
  actorUserId: number;

  @Column({ name: "actor_name", type: "varchar", length: 255 })
  actorName: string;

  @Column({ type: "varchar", length: 40 })
  action: AnnixOrbitAuditAction;

  @Column({ name: "candidate_id", type: "int", nullable: true })
  candidateId: number | null;

  @Column({ name: "submission_id", type: "int", nullable: true })
  submissionId: number | null;

  @Column({ name: "shortlist_id", type: "int", nullable: true })
  shortlistId: number | null;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ type: "text", nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
