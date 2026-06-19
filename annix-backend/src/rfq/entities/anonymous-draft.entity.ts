import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export class AnonymousDraft {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Unique recovery token for email-based retrieval",
    example: "abc123def456...",
  })
  recoveryToken: string;

  @ApiProperty({
    description: "Customer email for recovery",
    example: "customer@example.com",
  })
  customerEmail?: string;

  @ApiProperty({
    description: "Project name (for display purposes)",
    example: "500NB Pipeline Extension",
  })
  projectName?: string;

  @ApiProperty({
    description: "Current step in the RFQ form (1-5)",
    example: 2,
  })
  currentStep: number;

  @ApiProperty({
    description: "Complete form state as JSON",
  })
  formData: Record<string, any>;

  @ApiProperty({
    description: "Global specifications as JSON",
  })
  globalSpecs?: Record<string, any>;

  @ApiProperty({
    description: "Required products/services selected",
  })
  requiredProducts?: string[];

  @ApiProperty({
    description: "Pipe entries as JSON",
  })
  entries?: Record<string, any>[];

  @ApiProperty({
    description: "Whether a recovery email has been sent",
    example: false,
  })
  recoveryEmailSent: boolean;

  @ApiProperty({
    description: "Timestamp when recovery email was sent",
  })
  recoveryEmailSentAt?: Date;

  @ApiProperty({
    description: "User who claimed this draft",
  })
  claimedBy?: User;

  @ApiProperty({
    description: "Whether the draft has been claimed by a registered user",
    example: false,
  })
  isClaimed: boolean;

  @ApiProperty({
    description: "Browser fingerprint for matching localStorage drafts",
  })
  browserFingerprint?: string;

  @ApiProperty({
    description: "Expiry date (drafts expire after 7 days)",
  })
  expiresAt: Date;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
