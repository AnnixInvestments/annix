import { ApiProperty } from "@nestjs/swagger";
export type PasskeyChallengeType = "registration" | "authentication";

export class PasskeyChallenge {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Optional user id (null for usernameless authentication)" })
  userId: number | null;

  @ApiProperty({ description: "Base64url encoded challenge bytes" })
  challenge: string;

  @ApiProperty({ description: "Challenge type", enum: ["registration", "authentication"] })
  type: PasskeyChallengeType;

  @ApiProperty({ description: "Expiry timestamp" })
  expiresAt: Date;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
