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

export class CustomerProfile extends BasePortalProfile {
  company: Company;

  companyId: number;

  firstName: string;

  lastName: string;

  role: CustomerRole;

  accountStatus: CustomerAccountStatus;

  deviceBindings: CustomerDeviceBinding[];

  sessions: CustomerSession[];

  loginAttempts: CustomerLoginAttempt[];

  termsAcceptedAt: Date;

  securityPolicyAcceptedAt: Date;

  onboarding: CustomerOnboarding;

  documents: CustomerDocument[];

  githubFeedbackIssueNumber: number | null;
}
