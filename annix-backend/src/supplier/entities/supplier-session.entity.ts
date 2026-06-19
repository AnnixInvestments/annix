import { SessionInvalidationReason } from "../../shared/enums";
import { SupplierProfile } from "./supplier-profile.entity";

export {
  SessionInvalidationReason,
  SessionInvalidationReason as SupplierSessionInvalidationReason,
};

export class SupplierSession {
  id: number;

  supplierProfile: SupplierProfile;

  supplierProfileId: number;

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
