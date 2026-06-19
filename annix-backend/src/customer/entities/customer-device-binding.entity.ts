import { CustomerProfile } from "./customer-profile.entity";

export class CustomerDeviceBinding {
  id: number;

  customerProfile: CustomerProfile;

  customerProfileId: number;

  deviceFingerprint: string;

  isPrimary: boolean;

  isActive: boolean;

  browserInfo: Record<string, any>;

  registeredIp: string;

  ipCountry: string;

  createdAt: Date;

  updatedAt: Date;

  deactivatedAt: Date;

  deactivatedBy: number; // Admin user ID who reset the device

  deactivationReason: string;
}
