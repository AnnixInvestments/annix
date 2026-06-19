import { Company } from "../../platform/entities/company.entity";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { CustomerProfile } from "./customer-profile.entity";

export class CustomerBlockedSupplier {
  id: number;

  customerCompany: Company;

  customerCompanyId: number;

  supplierProfile: SupplierProfile;

  supplierProfileId: number;

  blockedBy: CustomerProfile;

  blockedById: number;

  reason: string | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
