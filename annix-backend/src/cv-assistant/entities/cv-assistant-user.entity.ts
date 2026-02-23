import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CvAssistantCompany } from "./cv-assistant-company.entity";

export enum CvAssistantRole {
  VIEWER = "viewer",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

@Entity("cv_assistant_users")
export class CvAssistantUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, default: CvAssistantRole.RECRUITER })
  role: CvAssistantRole;

  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ name: "email_verification_token", type: "varchar", length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ name: "email_verification_expires", type: "timestamptz", nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ name: "reset_password_token", type: "varchar", length: 255, nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: "reset_password_expires", type: "timestamptz", nullable: true })
  resetPasswordExpires: Date | null;

  @ManyToOne(() => CvAssistantCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CvAssistantCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
