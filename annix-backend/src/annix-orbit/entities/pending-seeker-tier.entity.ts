import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_pending_seeker_tiers")
@Index("idx_orbit_pending_seeker_tier_email", ["emailNormalized"], { unique: true })
export class PendingSeekerTier {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "email_normalized", type: "varchar", length: 320 })
  emailNormalized: string;

  @Column({ name: "tier", type: "varchar", length: 40 })
  tier: string;

  @Column({ name: "permanent", type: "boolean", default: false })
  permanent: boolean;

  @Column({ name: "trial_days", type: "int", nullable: true })
  trialDays: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
