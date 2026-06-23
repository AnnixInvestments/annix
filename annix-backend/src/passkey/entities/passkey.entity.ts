import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export class Passkey {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Owning user id" })
  userId: number;

  @ApiProperty({
    description:
      "Identity scope of the portal that registered this credential. A passkey may only authenticate the app it was created for.",
    nullable: true,
  })
  appScope: string | null;

  user: User;

  @ApiProperty({ description: "WebAuthn credential id (base64url encoded)" })
  credentialId: string;

  @ApiProperty({ description: "Authenticator public key (base64url COSE)" })
  publicKey: string;

  @ApiProperty({ description: "Signature counter for replay protection" })
  counter: string;

  @ApiProperty({ description: "Available transports advertised by the authenticator" })
  transports: string[];

  @ApiProperty({ description: "Friendly device name set by user" })
  deviceName: string | null;

  @ApiProperty({ description: "Whether the credential is eligible for backup (synced)" })
  backupEligible: boolean;

  @ApiProperty({ description: "Whether the credential has been backed up" })
  backupState: boolean;

  @ApiProperty({ description: "Last successful authentication timestamp" })
  lastUsedAt: Date | null;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;
}
