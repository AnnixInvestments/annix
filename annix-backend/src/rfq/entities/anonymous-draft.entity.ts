import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("anonymous_drafts")
export class AnonymousDraft {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Unique recovery token for email-based retrieval",
    example: "abc123def456...",
  })
  @Column({ name: "recovery_token", unique: true, length: 64 })
  @Index()
  recoveryToken: string;

  @ApiProperty({
    description: "Customer email for recovery",
    example: "customer@example.com",
  })
  @Column({ name: "customer_email", nullable: true })
  @Index()
  customerEmail?: string;

  @ApiProperty({
    description: "Project name (for display purposes)",
    example: "500NB Pipeline Extension",
  })
  @Column({ name: "project_name", nullable: true })
  projectName?: string;

  @ApiProperty({
    description: "Current step in the RFQ form (1-5)",
    example: 2,
  })
  @Column({ name: "current_step", type: "int", default: 1 })
  currentStep: number;

  @ApiProperty({
    description: "Complete form state as JSON",
  })
  @Column({ name: "form_data", type: "jsonb" })
  formData: Record<string, any>;

  @ApiProperty({
    description: "Global specifications as JSON",
  })
  @Column({ name: "global_specs", type: "jsonb", nullable: true })
  globalSpecs?: Record<string, any>;

  @ApiProperty({
    description: "Required products/services selected",
  })
  @Column({ name: "required_products", type: "jsonb", nullable: true })
  requiredProducts?: string[];

  @ApiProperty({
    description: "Pipe entries as JSON",
  })
  @Column({ name: "entries", type: "jsonb", nullable: true })
  entries?: Record<string, any>[];

  @ApiProperty({
    description: "Whether a recovery email has been sent",
    example: false,
  })
  @Column({ name: "recovery_email_sent", default: false })
  recoveryEmailSent: boolean;

  @ApiProperty({
    description: "Timestamp when recovery email was sent",
  })
  @Column({ name: "recovery_email_sent_at", nullable: true })
  recoveryEmailSentAt?: Date;

  @ApiProperty({
    description: "User ID if the draft was claimed by a registered user",
  })
  @Column({ name: "claimed_by_user_id", nullable: true })
  claimedByUserId?: number;

  @ApiProperty({
    description: "Whether the draft has been claimed by a registered user",
    example: false,
  })
  @Column({ name: "is_claimed", default: false })
  isClaimed: boolean;

  @ApiProperty({
    description: "Browser fingerprint for matching localStorage drafts",
  })
  @Column({ name: "browser_fingerprint", nullable: true })
  browserFingerprint?: string;

  @ApiProperty({
    description: "Expiry date (drafts expire after 7 days)",
  })
  @Column({ name: "expires_at" })
  expiresAt: Date;

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
