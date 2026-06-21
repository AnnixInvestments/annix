import { CompanyModuleSubscription } from "./company-module-subscription.entity";
import { Contact } from "./contact.entity";

export enum CompanyType {
  MANUFACTURER = "MANUFACTURER",
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
  HYBRID = "HYBRID",
}

export enum BrandingType {
  ANNIX = "annix",
  CUSTOM = "custom",
}

export class Company {
  id: number;

  name: string;

  companyType: CompanyType;

  registrationNumber: string | null;

  customerCode: string | null;

  vatNumber: string | null;

  phone: string | null;

  email: string | null;

  contactPerson: string | null;

  streetAddress: string | null;

  city: string | null;

  province: string | null;

  postalCode: string | null;

  addressJsonb: Record<string, string> | null;

  notes: string | null;

  websiteUrl: string | null;

  brandingType: BrandingType;

  brandingAuthorized: boolean;

  primaryColor: string | null;

  accentColor: string | null;

  logoUrl: string | null;

  heroImageUrl: string | null;

  smtpHost: string | null;

  smtpPort: number | null;

  smtpUser: string | null;

  smtpPassEncrypted: Buffer | null;

  smtpFromName: string | null;

  smtpFromEmail: string | null;

  notificationEmails: string[];

  emailConfig: Record<string, string> | null;

  pipingLossFactorPct: number;

  flatPlateLossFactorPct: number;

  structuralSteelLossFactorPct: number;

  qcEnabled: boolean;

  messagingEnabled: boolean;

  staffLeaveEnabled: boolean;

  workflowEnabled: boolean;

  firebaseUid: string | null;

  tradingName: string | null;

  legalName: string | null;

  industry: string | null;

  companySize: string | null;

  country: string;

  currencyCode: string;

  beeLevel: number | null;

  beeCertificateExpiry: Date | null;

  beeVerificationAgency: string | null;

  isExemptMicroEnterprise: boolean;

  beeExpiryNotificationSentAt: Date | null;

  onboardingComplete: boolean;

  ownerUserId: number | null;

  ownerCompanyId: number | null;

  moduleSubscriptions: CompanyModuleSubscription[];

  contacts: Contact[];

  createdAt: Date;

  updatedAt: Date;
}
