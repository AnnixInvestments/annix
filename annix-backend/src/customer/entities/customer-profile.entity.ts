import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { BasePortalProfile } from "../../platform/entities/base-portal-profile";
import { Company } from "../../platform/entities/company.entity";
import { CustomerDeviceBinding } from "./customer-device-binding.entity";
import { CustomerDocument } from "./customer-document.entity";
import { CustomerLoginAttempt } from "./customer-login-attempt.entity";
import { CustomerOnboarding } from "./customer-onboarding.entity";
import { CustomerSession } from "./customer-session.entity";

export enum CustomerAccountStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
}

export enum CustomerRole {
  CUSTOMER_ADMIN = "customer_admin",
  CUSTOMER_STANDARD = "customer_standard",
}

@Entity("customer_profiles")
export class CustomerProfile extends BasePortalProfile {
  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "first_name", length: 100 })
  firstName: string;

  @Column({ name: "last_name", length: 100 })
  lastName: string;

  @Column({
    name: "role",
    type: "enum",
    enum: CustomerRole,
    default: CustomerRole.CUSTOMER_ADMIN,
  })
  role: CustomerRole;

  @Column({
    name: "account_status",
    type: "enum",
    enum: CustomerAccountStatus,
    default: CustomerAccountStatus.PENDING,
  })
  accountStatus: CustomerAccountStatus;

  @OneToMany(
    () => CustomerDeviceBinding,
    (binding) => binding.customerProfile,
  )
  deviceBindings: CustomerDeviceBinding[];

  @OneToMany(
    () => CustomerSession,
    (session) => session.customerProfile,
  )
  sessions: CustomerSession[];

  @OneToMany(
    () => CustomerLoginAttempt,
    (attempt) => attempt.customerProfile,
  )
  loginAttempts: CustomerLoginAttempt[];

  @Column({ name: "terms_accepted_at", type: "timestamp", nullable: true })
  termsAcceptedAt: Date;

  @Column({
    name: "security_policy_accepted_at",
    type: "timestamp",
    nullable: true,
  })
  securityPolicyAcceptedAt: Date;

  @OneToOne(
    () => CustomerOnboarding,
    (onboarding) => onboarding.customer,
  )
  onboarding: CustomerOnboarding;

  @OneToMany(
    () => CustomerDocument,
    (document) => document.customer,
  )
  documents: CustomerDocument[];

  @Column({ name: "github_feedback_issue_number", type: "int", nullable: true })
  githubFeedbackIssueNumber: number | null;
}
