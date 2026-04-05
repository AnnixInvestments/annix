import {
  Column,
  CreateDateColumn,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

export abstract class BasePortalProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "job_title", length: 100, nullable: true })
  jobTitle: string;

  @Column({ name: "direct_phone", length: 30, nullable: true })
  directPhone: string;

  @Column({ name: "mobile_phone", length: 30, nullable: true })
  mobilePhone: string;

  @Column({ name: "email_verified", default: false })
  emailVerified: boolean;

  @Column({
    name: "email_verification_token",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  emailVerificationToken: string | null;

  @Column({
    name: "email_verification_expires",
    type: "timestamp",
    nullable: true,
  })
  emailVerificationExpires: Date | null;

  @Column({ name: "suspension_reason", type: "text", nullable: true })
  suspensionReason?: string | null;

  @Column({ name: "suspended_at", type: "timestamp", nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: "suspended_by", type: "int", nullable: true })
  suspendedBy?: number | null;

  @Column({
    name: "document_storage_accepted_at",
    type: "timestamp",
    nullable: true,
  })
  documentStorageAcceptedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
