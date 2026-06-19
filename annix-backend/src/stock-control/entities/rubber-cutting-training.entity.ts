import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class RubberCuttingTraining {
  id: number;

  companyId: number;

  company: StockControlCompany;

  jobCardId: number;

  panelFingerprint: string;

  panelCount: number;

  panelSummary: Array<{ widthMm: number; lengthMm: number; quantity: number }>;

  autoPlanSnapshot: Record<string, any>;

  manualPlan: Record<string, any>;

  autoWastePct: number;

  manualWastePct: number;

  rollWidthMm: number;

  rollLengthMm: number;

  usageCount: number;

  timesSuggested: number;

  timesApplied: number;

  timesAppliedModified: number;

  timesIgnored: number;

  feedbackScore: number;

  reviewedBy: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  lastUsedAt: Date;
}
