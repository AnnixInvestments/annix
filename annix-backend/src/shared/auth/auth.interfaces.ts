export interface SessionEntity {
  id: number;
  sessionToken: string;
  refreshToken?: string;
  deviceFingerprint?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity?: Date;
  invalidatedAt?: Date;
  invalidationReason?: string;
}

export interface LoginAttemptEntity {
  id: number;
  email: string;
  success: boolean;
  failureReason?: string;
  deviceFingerprint?: string;
  ipAddress: string;
  userAgent: string;
  attemptTime: Date;
  ipMismatchWarning?: boolean;
}

export interface DeviceBindingEntity {
  id: number;
  deviceFingerprint: string;
  registeredIp: string;
  browserInfo?: Record<string, any>;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface JwtTokenPayload {
  sub: number;
  email: string;
  type: "customer" | "supplier" | "admin" | "annixRep";
  sessionToken: string;
  customerId?: number;
  supplierId?: number;
  annixRepUserId?: number;
  roles?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface CreateSessionData<TProfileId extends string> {
  profileId: number;
  profileIdField: TProfileId;
  sessionToken: string;
  refreshToken: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}

export interface DeviceVerificationResult {
  isValid: boolean;
  binding: DeviceBindingEntity | null;
  failureReason?: "no_binding" | "fingerprint_mismatch";
}

export interface LogLoginAttemptData<TProfileId extends string> {
  profileId: number | null;
  profileIdField: TProfileId;
  email: string;
  success: boolean;
  failureReason: string | null;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  ipMismatchWarning?: boolean;
}
