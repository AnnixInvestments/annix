import { RubberPricingTier } from "./rubber-pricing-tier.entity";

export enum CompanyType {
  CUSTOMER = "CUSTOMER",
  SUPPLIER = "SUPPLIER",
}

export class RubberCompany {
  id: number;

  firebaseUid: string;

  name: string;

  companyType: CompanyType;

  code: string | null;

  pricingTierFirebaseUid: string | null;

  pricingTierId: number | null;

  pricingTier: RubberPricingTier | null;

  availableProducts: string[];

  isCompoundOwner: boolean;

  discountPercent: string | null;

  vatNumber: string | null;

  registrationNumber: string | null;

  address: Record<string, string> | null;

  notes: string | null;

  phone: string | null;

  contactPerson: string | null;

  emailConfig: Record<string, string> | null;

  sageContactId: number | null;

  sageContactType: string | null;

  auCocRecipientEmail: string | null;

  autoApproveAuCocs: boolean;

  createdAt: Date;

  updatedAt: Date;
}
