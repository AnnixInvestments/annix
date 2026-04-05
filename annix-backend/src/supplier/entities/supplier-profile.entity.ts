import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { BasePortalProfile } from "../../platform/entities/base-portal-profile";
import { SupplierCapability } from "./supplier-capability.entity";
import { SupplierCompany } from "./supplier-company.entity";
import { SupplierDeviceBinding } from "./supplier-device-binding.entity";
import { SupplierDocument } from "./supplier-document.entity";
import { SupplierLoginAttempt } from "./supplier-login-attempt.entity";
import { SupplierOnboarding } from "./supplier-onboarding.entity";
import { SupplierSession } from "./supplier-session.entity";

export enum SupplierAccountStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
}

@Entity("supplier_profiles")
export class SupplierProfile extends BasePortalProfile {
  @ManyToOne(
    () => SupplierCompany,
    (company) => company.profiles,
    {
      nullable: true,
    },
  )
  @JoinColumn({ name: "company_id" })
  company: SupplierCompany;

  @Column({ name: "company_id", nullable: true })
  companyId: number;

  @Column({ name: "first_name", length: 100, nullable: true })
  firstName: string;

  @Column({ name: "last_name", length: 100, nullable: true })
  lastName: string;

  @Column({
    name: "account_status",
    type: "enum",
    enum: SupplierAccountStatus,
    default: SupplierAccountStatus.PENDING,
  })
  accountStatus: SupplierAccountStatus;

  @OneToMany(
    () => SupplierDeviceBinding,
    (binding) => binding.supplierProfile,
  )
  deviceBindings: SupplierDeviceBinding[];

  @OneToMany(
    () => SupplierSession,
    (session) => session.supplierProfile,
  )
  sessions: SupplierSession[];

  @OneToMany(
    () => SupplierLoginAttempt,
    (attempt) => attempt.supplierProfile,
  )
  loginAttempts: SupplierLoginAttempt[];

  @OneToOne(
    () => SupplierOnboarding,
    (onboarding) => onboarding.supplier,
  )
  onboarding: SupplierOnboarding;

  @OneToMany(
    () => SupplierDocument,
    (document) => document.supplier,
  )
  documents: SupplierDocument[];

  @OneToMany(
    () => SupplierCapability,
    (capability) => capability.supplierProfile,
  )
  capabilities: SupplierCapability[];

  @Column({ name: "terms_accepted_at", type: "timestamp", nullable: true })
  termsAcceptedAt: Date | null;

  @Column({
    name: "security_policy_accepted_at",
    type: "timestamp",
    nullable: true,
  })
  securityPolicyAcceptedAt: Date | null;
}
