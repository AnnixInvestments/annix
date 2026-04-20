import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";

@Entity()
export class User {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Unique username", example: "john_doe" })
  @Column({ unique: true, nullable: true })
  username: string;

  @ApiProperty({
    description: "User email address",
    example: "john@example.com",
  })
  @Column({ unique: true, nullable: true })
  email: string;

  @ApiProperty({ description: "First name", example: "John" })
  @Column({ nullable: true })
  firstName?: string;

  @ApiProperty({ description: "Last name", example: "Doe" })
  @Column({ nullable: true })
  lastName?: string;

  @ApiProperty({ description: "Canonical bcrypt password hash (replaces password+salt)" })
  @Exclude()
  @Column({ name: "password_hash", type: "varchar", length: 255, nullable: true })
  passwordHash: string | null;

  @ApiProperty({ description: "Whether the user's email has been verified" })
  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified: boolean;

  @ApiProperty({ description: "Email verification token" })
  @Column({ name: "email_verification_token", type: "varchar", length: 500, nullable: true })
  emailVerificationToken: string | null;

  @ApiProperty({ description: "Email verification token expiry" })
  @Column({ name: "email_verification_expires", type: "timestamptz", nullable: true })
  emailVerificationExpires: Date | null;

  @ApiProperty({ description: "Password reset token" })
  @Column({ name: "reset_password_token", type: "varchar", length: 255, nullable: true })
  resetPasswordToken: string | null;

  @ApiProperty({ description: "Password reset token expiry" })
  @Column({ name: "reset_password_expires", type: "timestamptz", nullable: true })
  resetPasswordExpires: Date | null;

  @ApiProperty({ description: "OAuth provider (google, microsoft, zoom)" })
  @Column({ nullable: true })
  oauthProvider?: string;

  @ApiProperty({ description: "OAuth provider user ID" })
  @Column({ nullable: true })
  oauthId?: string;

  @ApiProperty({ description: "User account status", example: "active" })
  @Column({ default: "active" })
  status: string;

  @ApiProperty({ description: "Last login timestamp" })
  @Column({ type: "timestamp", nullable: true })
  lastLoginAt?: Date;

  @ApiProperty({
    description: "Roles assigned to the user",
    type: () => [UserRole],
  })
  @ManyToMany(
    () => UserRole,
    (role) => role.users,
    { eager: true },
  )
  @JoinTable()
  roles: UserRole[];

  @ApiProperty({ description: "RFQs created by this user", type: () => [Rfq] })
  @OneToMany(
    () => Rfq,
    (rfq) => rfq.createdBy,
    { lazy: true },
  )
  rfqs: Promise<Rfq[]>;

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
