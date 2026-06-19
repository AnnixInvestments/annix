import { CustomerProfile } from "./customer-profile.entity";

export enum LoginFailureReason {
  INVALID_CREDENTIALS = "invalid_credentials",
  DEVICE_MISMATCH = "device_mismatch",
  ACCOUNT_SUSPENDED = "account_suspended",
  ACCOUNT_PENDING = "account_pending",
  ACCOUNT_DEACTIVATED = "account_deactivated",
  TOO_MANY_ATTEMPTS = "too_many_attempts",
  EMAIL_NOT_VERIFIED = "email_not_verified",
}

export class CustomerLoginAttempt {
  id: number;

  customerProfile: CustomerProfile;

  customerProfileId: number;

  email: string;

  success: boolean;

  failureReason: LoginFailureReason;

  deviceFingerprint: string;

  ipAddress: string;

  userAgent: string;

  ipMismatchWarning: boolean;

  attemptTime: Date;
}
