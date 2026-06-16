import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_early_access_signups")
@Index("idx_orbit_early_access_email", ["emailNormalized"], { unique: true })
@Index("idx_orbit_early_access_mobile", ["mobileNormalized"], { unique: true })
@Index("idx_orbit_early_access_referral_code", ["referralCode"], { unique: true })
export class OrbitEarlyAccessSignup {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "first_name", type: "varchar", length: 120 })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 120 })
  lastName: string;

  @Column({ name: "email", type: "varchar", length: 200 })
  email: string;

  @Column({ name: "email_normalized", type: "varchar", length: 200 })
  emailNormalized: string;

  @Column({ name: "mobile_number", type: "varchar", length: 40 })
  mobileNumber: string;

  @Column({ name: "mobile_normalized", type: "varchar", length: 40 })
  mobileNormalized: string;

  @Column({ name: "current_role", type: "varchar", length: 160, nullable: true })
  currentRole: string | null;

  @Column({ name: "industry", type: "varchar", length: 160, nullable: true })
  industry: string | null;

  @Column({ name: "years_experience", type: "varchar", length: 60, nullable: true })
  yearsExperience: string | null;

  @Column({ name: "age_range", type: "varchar", length: 20, nullable: true })
  ageRange: string | null;

  @Column({ name: "ethnic_background", type: "varchar", length: 30, nullable: true })
  ethnicBackground: string | null;

  @Column({ name: "consent_to_contact", type: "boolean", default: false })
  consentToContact: boolean;

  @Column({ name: "consented_at", type: "timestamptz", nullable: true })
  consentedAt: Date | null;

  @Column({ name: "source", type: "varchar", length: 80, default: "direct" })
  source: string;

  @Column({ name: "campaign", type: "varchar", length: 120, nullable: true })
  campaign: string | null;

  @Column({ name: "platform", type: "varchar", length: 80, nullable: true })
  platform: string | null;

  @Column({ name: "device", type: "varchar", length: 20, nullable: true })
  device: string | null;

  @Column({ name: "referral_code", type: "varchar", length: 24 })
  referralCode: string;

  @Column({ name: "referred_by", type: "varchar", length: 24, nullable: true })
  referredBy: string | null;

  @Column({ name: "referral_count", type: "int", default: 0 })
  referralCount: number;

  @Column({ name: "welcome_sent_at", type: "timestamptz", nullable: true })
  welcomeSentAt: Date | null;

  @Column({ name: "day3_sent_at", type: "timestamptz", nullable: true })
  day3SentAt: Date | null;

  @Column({ name: "day7_sent_at", type: "timestamptz", nullable: true })
  day7SentAt: Date | null;

  @Column({ name: "launch_sent_at", type: "timestamptz", nullable: true })
  launchSentAt: Date | null;

  @Column({ name: "admin_email_sent_at", type: "timestamptz", nullable: true })
  adminEmailSentAt: Date | null;

  // Environment the admin invite directed this applicant to ("prod" | "test").
  // Applicants always live on prod; this drives which env monitors/registers
  // them. Null until an admin sends an invite with an env selected.
  @Column({ name: "invited_env", type: "varchar", length: 8, nullable: true })
  invitedEnv: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
