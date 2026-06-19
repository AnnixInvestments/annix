import { BasePortalProfile } from "../../platform/entities/base-portal-profile";
import { Company } from "../../platform/entities/company.entity";
import { SupplierCapability } from "./supplier-capability.entity";
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

export class SupplierProfile extends BasePortalProfile {
  company: Company;

  companyId: number;

  firstName: string;

  lastName: string;

  accountStatus: SupplierAccountStatus;

  deviceBindings: SupplierDeviceBinding[];

  sessions: SupplierSession[];

  loginAttempts: SupplierLoginAttempt[];

  onboarding: SupplierOnboarding;

  documents: SupplierDocument[];

  capabilities: SupplierCapability[];

  termsAcceptedAt: Date | null;

  securityPolicyAcceptedAt: Date | null;
}
