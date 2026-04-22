import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum StockControlRole {
  STOREMAN = "storeman",
  ACCOUNTS = "accounts",
  MANAGER = "manager",
  ADMIN = "admin",
}

@Entity("stock_control_users")
export class StockControlUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, default: StockControlRole.STOREMAN })
  role: string;

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

  @Column({ name: "hide_tooltips", type: "boolean", default: false })
  hideTooltips: boolean;

  @Column({ name: "email_notifications_enabled", type: "boolean", default: true })
  emailNotificationsEnabled: boolean;

  @Column({ name: "push_notifications_enabled", type: "boolean", default: true })
  pushNotificationsEnabled: boolean;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "linked_staff_id" })
  linkedStaff: StaffMember | null;

  @Column({ name: "linked_staff_id", nullable: true })
  linkedStaffId: number | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @Column({ name: "unified_user_id", type: "int", nullable: true })
  unifiedUserId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
