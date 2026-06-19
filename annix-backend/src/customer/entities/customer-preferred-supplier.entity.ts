import { Company } from "../../platform/entities/company.entity";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { CustomerProfile } from "./customer-profile.entity";

export class CustomerPreferredSupplier {
  id: number;

  customerCompany: Company;

  customerCompanyId: number;

  supplierProfile: SupplierProfile;

  supplierProfileId: number | null;

  // For suppliers not yet in system
  supplierName: string | null;

  supplierEmail: string | null;

  addedBy: CustomerProfile;

  addedById: number;

  priority: number;

  notes: string | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
