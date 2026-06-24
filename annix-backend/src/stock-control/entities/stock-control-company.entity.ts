import { Address, ContactDetails } from "../../lib/value-objects";
import { PaintPricingConfig } from "./paint-pricing-config";
import { RubberPricingConfig } from "./rubber-pricing-config";
import { WorkflowStepConfig } from "./workflow-step-config.entity";

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

  address: Address | null;

  contact: ContactDetails | null;

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

  paintPricingConfig: PaintPricingConfig | null;

  rubberPricingConfig: RubberPricingConfig | null;
  actionPermissions: Record<string, string[]> | null;

  rbacConfig: Record<string, string[]> | null;

  workflowStepConfigs: WorkflowStepConfig[] | null;

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
