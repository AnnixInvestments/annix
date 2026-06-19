import type { StockManagementTier } from "../config/stock-management-features.constants";

export class CompanyModuleLicense {
  id: number;

  companyId: number;

  moduleKey: string;

  tier: StockManagementTier;

  featureOverrides: Record<string, boolean>;

  validFrom: Date | null;

  validUntil: Date | null;

  active: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
