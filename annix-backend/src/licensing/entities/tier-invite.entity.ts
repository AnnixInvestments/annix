import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type TierInviteStatus = "pending" | "accepted" | "expired";

@Entity("tier_invite")
@Index(["email", "moduleKey"])
export class TierInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "module_key", type: "varchar", length: 64 })
  moduleKey: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ name: "tier_key", type: "varchar", length: 64 })
  tierKey: string;

  @Column({ name: "free_days", type: "integer" })
  freeDays: number;

  @Column({ type: "varchar", length: 128, unique: true })
  token: string;

  @Column({ type: "varchar", length: 16, default: "pending" })
  status: TierInviteStatus;

  @Column({ name: "invited_by_id", type: "integer", nullable: true })
  invitedById: number | null;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt: Date | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
