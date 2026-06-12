import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { AnnixOrbitRecruiterRole } from "./annix-orbit-profile.entity";

export const ORBIT_TEAM_INVITE_STATUSES = ["pending", "accepted", "cancelled"] as const;
export type AnnixOrbitTeamInviteStatus = (typeof ORBIT_TEAM_INVITE_STATUSES)[number];

@Entity("orbit_team_invites")
@Index(["companyId"])
export class AnnixOrbitTeamInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "recruiter_role", type: "varchar", length: 20 })
  recruiterRole: AnnixOrbitRecruiterRole;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({ name: "invited_by_user_id" })
  invitedByUserId: number;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status: AnnixOrbitTeamInviteStatus;

  @Column({ name: "expires_at", type: "varchar", length: 30, nullable: true })
  expiresAt: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
