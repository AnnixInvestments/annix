import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ComplySaCompany } from "./company.entity";

@Entity("comply_sa_users")
export class ComplySaUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20, default: "owner" })
  role!: string;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified!: boolean;

  @Column({ name: "email_verification_token", type: "varchar", length: 100, nullable: true })
  emailVerificationToken!: string | null;

  @Column({ name: "password_reset_token", type: "varchar", length: 100, nullable: true })
  passwordResetToken!: string | null;

  @Column({ name: "password_reset_expires_at", type: "timestamp", nullable: true })
  passwordResetExpiresAt!: Date | null;

  @ManyToOne(
    () => ComplySaCompany,
    (company) => company.users,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
