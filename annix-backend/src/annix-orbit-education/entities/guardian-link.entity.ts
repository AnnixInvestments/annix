import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Links a minor's education profile to a guardian (D3: the student invites a
 * guardian by email; the guardian confirms consent before any processing).
 * `guardianUserId` is populated once the guardian accepts and has an account.
 */
@Entity("orbit_education_guardian_links")
@Index("idx_orbit_education_guardian_profile", ["educationProfileId"])
export class GuardianLink {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid" })
  educationProfileId: string;

  @Column({ name: "guardian_user_id", type: "int", nullable: true })
  guardianUserId: number | null;

  @Column({ name: "guardian_email", type: "varchar", length: 255 })
  guardianEmail: string;

  @Column({ type: "varchar", length: 16, default: "invited" })
  status: string;

  @Column({ name: "invited_at", type: "timestamptz" })
  invitedAt: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
