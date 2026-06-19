import { Company } from "./company.entity";

export enum ContactType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
  BOTH = "BOTH",
}

export class Contact {
  id: number;

  companyId: number;

  company: Company;

  name: string;

  contactType: ContactType;

  code: string | null;

  registrationNumber: string | null;

  vatNumber: string | null;

  phone: string | null;

  email: string | null;

  contactPerson: string | null;

  addressText: string | null;

  addressJsonb: Record<string, string> | null;

  notes: string | null;

  emailConfig: Record<string, string> | null;

  availableProducts: string[];

  firebaseUid: string | null;

  pricingTierId: number | null;

  pricingTierFirebaseUid: string | null;

  sageContactId: number | null;

  sageContactType: string | null;

  createdAt: Date;

  updatedAt: Date;
}
