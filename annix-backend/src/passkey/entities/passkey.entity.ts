import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity({ name: "passkeys" })
export class Passkey {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Owning user id" })
  @Column({ name: "user_id", type: "int" })
  @Index()
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ApiProperty({ description: "WebAuthn credential id (base64url encoded)" })
  @Column({ name: "credential_id", type: "varchar", length: 512, unique: true })
  credentialId: string;

  @ApiProperty({ description: "Authenticator public key (base64url COSE)" })
  @Column({ name: "public_key", type: "text" })
  publicKey: string;

  @ApiProperty({ description: "Signature counter for replay protection" })
  @Column({ type: "bigint", default: 0 })
  counter: string;

  @ApiProperty({ description: "Available transports advertised by the authenticator" })
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  transports: string[];

  @ApiProperty({ description: "Friendly device name set by user" })
  @Column({ name: "device_name", type: "varchar", length: 120, nullable: true })
  deviceName: string | null;

  @ApiProperty({ description: "Whether the credential is eligible for backup (synced)" })
  @Column({ name: "backup_eligible", type: "boolean", default: false })
  backupEligible: boolean;

  @ApiProperty({ description: "Whether the credential has been backed up" })
  @Column({ name: "backup_state", type: "boolean", default: false })
  backupState: boolean;

  @ApiProperty({ description: "Last successful authentication timestamp" })
  @Column({ name: "last_used_at", type: "timestamptz", nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
