import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type PasskeyChallengeType = "registration" | "authentication";

@Entity({ name: "passkey_challenges" })
export class PasskeyChallenge {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Optional user id (null for usernameless authentication)" })
  @Column({ name: "user_id", type: "int", nullable: true })
  @Index()
  userId: number | null;

  @ApiProperty({ description: "Base64url encoded challenge bytes" })
  @Column({ type: "varchar", length: 512 })
  challenge: string;

  @ApiProperty({ description: "Challenge type", enum: ["registration", "authentication"] })
  @Column({ type: "varchar", length: 20 })
  type: PasskeyChallengeType;

  @ApiProperty({ description: "Expiry timestamp" })
  @Column({ name: "expires_at", type: "timestamptz" })
  @Index()
  expiresAt: Date;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
