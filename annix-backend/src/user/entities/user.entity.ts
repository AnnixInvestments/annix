import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";

export class User {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Unique username", example: "john_doe" })
  username: string;

  @ApiProperty({
    description: "User email address",
    example: "john@example.com",
  })
  email: string;

  @ApiProperty({ description: "First name", example: "John" })
  firstName?: string;

  @ApiProperty({ description: "Last name", example: "Doe" })
  lastName?: string;

  @ApiProperty({ description: "Canonical bcrypt password hash (replaces password+salt)" })
  @Exclude()
  passwordHash: string | null;

  @ApiProperty({ description: "Whether the user's email has been verified" })
  emailVerified: boolean;

  @ApiProperty({ description: "Email verification token" })
  emailVerificationToken: string | null;

  @ApiProperty({ description: "Email verification token expiry" })
  emailVerificationExpires: Date | null;

  @ApiProperty({ description: "Password reset token" })
  resetPasswordToken: string | null;

  @ApiProperty({ description: "Password reset token expiry" })
  resetPasswordExpires: Date | null;

  @ApiProperty({ description: "OAuth provider (google, microsoft, zoom)" })
  oauthProvider?: string;

  @ApiProperty({ description: "OAuth provider user ID" })
  oauthId?: string;

  @ApiProperty({
    description:
      "Identity scope — which app/module owns this account (e.g. 'orbit:seeker'). Null = legacy shared account. The same email may hold one account per scope.",
    example: "orbit:seeker",
  })
  appScope: string | null;

  @ApiProperty({
    description: "WhatsApp phone number in E.164-ish digit form (nullable)",
    example: "27110000000",
    nullable: true,
  })
  whatsappPhone: string | null;

  @ApiProperty({
    description: "Whether the user has opted in to WhatsApp messaging",
    example: false,
  })
  whatsappOptIn: boolean;

  @ApiProperty({ description: "When the user opted in to WhatsApp messaging", nullable: true })
  whatsappOptInAt: Date | null;

  @ApiProperty({
    description:
      "When the user PROVED control of their WhatsApp number by replying to the inbound consent prompt. Null until proven. Distinct from whatsappOptIn, which the self-typed consent page can also set.",
    nullable: true,
  })
  whatsappVerifiedAt: Date | null;

  @ApiProperty({
    description:
      "The normalized WhatsApp number that actually replied to the consent prompt. Quota keys on this proven number, not the self-typed whatsappPhone. Changing whatsappPhone away from this value makes the seeker unverified again.",
    example: "27110000000",
    nullable: true,
  })
  whatsappVerifiedPhone: string | null;

  @ApiProperty({
    description: "When a WhatsApp consent request was last emailed to the user",
    nullable: true,
  })
  whatsappConsentRequestedAt: Date | null;

  @ApiProperty({ description: "User account status", example: "active" })
  status: string;

  @ApiProperty({ description: "Last login timestamp" })
  lastLoginAt?: Date;

  @ApiProperty({ description: "Tenant company this user belongs to", example: 1 })
  companyId: number | null;

  @ApiProperty({
    description: "Roles assigned to the user",
    type: () => [UserRole],
  })
  roles: UserRole[];

  @ApiProperty({ description: "RFQs created by this user", type: () => [Rfq] })
  rfqs: Promise<Rfq[]>;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
