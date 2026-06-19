import { SessionInvalidationReason } from "../../shared/enums";
import { CustomerProfile } from "./customer-profile.entity";

export { SessionInvalidationReason };

export class CustomerSession {
  id: number;

  customerProfile: CustomerProfile;

  customerProfileId: number;

  sessionToken: string;

  refreshToken: string;

  deviceFingerprint: string;

  ipAddress: string;

  userAgent: string;

  isActive: boolean;

  createdAt: Date;

  expiresAt: Date;

  lastActivity: Date;

  invalidatedAt: Date;

  invalidationReason: SessionInvalidationReason;
}
