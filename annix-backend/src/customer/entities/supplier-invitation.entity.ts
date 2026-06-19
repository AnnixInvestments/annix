import { Company } from "../../platform/entities/company.entity";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { CustomerProfile } from "./customer-profile.entity";

export enum SupplierInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export class SupplierInvitation {
  id: number;

  customerCompany: Company;

  customerCompanyId: number;

  invitedBy: CustomerProfile;

  invitedById: number;

  token: string;

  email: string;

  supplierCompanyName: string | null;

  status: SupplierInvitationStatus;

  createdAt: Date;

  expiresAt: Date;

  acceptedAt: Date | null;

  supplierProfile: SupplierProfile;

  supplierProfileId: number | null;

  message: string | null;
}
