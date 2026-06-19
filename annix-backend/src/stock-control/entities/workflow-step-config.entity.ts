import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export interface StepOutcome {
  key: string;
  label: string;
  nextStepKey: string | null;
  notifyStepKey: string | null;
  style: string;
}

export class WorkflowStepConfig {
  id: number;

  company: StockControlCompany;

  companyId: number;

  key: string;

  label: string;

  sortOrder: number;

  isSystem: boolean;

  isBackground: boolean;

  triggerAfterStep: string | null;

  actionLabel: string | null;

  branchColor: string | null;

  phaseActionLabels: Record<string, string> | null;

  stepOutcomes: StepOutcome[] | null;

  branchType: "loop" | "connect" | null;

  rejoinAtStep: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
