export enum BrandingType {
  ANNIX = "annix",
  CUSTOM = "custom",
}

export class StockControlCompany {
  id: number;

  name: string;

  brandingType: BrandingType;

  websiteUrl: string | null;

  brandingAuthorized: boolean;

  primaryColor: string | null;

  accentColor: string | null;

  logoUrl: string | null;

  heroImageUrl: string | null;

  registrationNumber: string | null;

  vatNumber: string | null;

  streetAddress: string | null;

  city: string | null;

  province: string | null;

  postalCode: string | null;

  phone: string | null;

  email: string | null;

  smtpHost: string | null;

  smtpPort: number | null;

  smtpUser: string | null;

  smtpPassEncrypted: Buffer | null;

  smtpFromName: string | null;

  smtpFromEmail: string | null;

  notificationEmails: string[];

  pipingLossFactorPct: number;

  flatPlateLossFactorPct: number;

  structuralSteelLossFactorPct: number;

  qcEnabled: boolean;

  messagingEnabled: boolean;

  staffLeaveEnabled: boolean;

  workflowEnabled: boolean;

  notificationsEnabled: boolean;

  sageUsername: string | null;

  sagePassEncrypted: Buffer | null;

  sageCompanyId: number | null;

  sageCompanyName: string | null;

  sageConnectedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
