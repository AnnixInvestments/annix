import { SupplierProfile } from "./supplier-profile.entity";

export class SupplierDeviceBinding {
  id: number;

  supplierProfile: SupplierProfile;

  supplierProfileId: number;

  deviceFingerprint: string;

  isPrimary: boolean;

  isActive: boolean;

  browserInfo: Record<string, any>;

  registeredIp: string;

  ipCountry: string;

  createdAt: Date;

  updatedAt: Date;

  deactivatedAt: Date;

  deactivatedBy: number;

  deactivationReason: string;
}
