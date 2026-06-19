import { SupplierProfile } from "./supplier-profile.entity";

export enum SupplierLoginFailureReason {
  INVALID_CREDENTIALS = "invalid_credentials",
  DEVICE_MISMATCH = "device_mismatch",
  ACCOUNT_SUSPENDED = "account_suspended",
  ACCOUNT_PENDING = "account_pending",
  ACCOUNT_DEACTIVATED = "account_deactivated",
  TOO_MANY_ATTEMPTS = "too_many_attempts",
  EMAIL_NOT_VERIFIED = "email_not_verified",
}

export class SupplierLoginAttempt {
  id: number;

  supplierProfile: SupplierProfile;

  supplierProfileId: number | null;

  email: string;

  success: boolean;

  failureReason: SupplierLoginFailureReason | null;

  deviceFingerprint: string;

  ipAddress: string;

  userAgent: string;

  ipMismatchWarning: boolean;

  attemptTime: Date;
}
