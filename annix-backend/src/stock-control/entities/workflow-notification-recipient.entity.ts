import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class WorkflowNotificationRecipient {
  id: number;

  company: StockControlCompany;

  companyId: number;

  workflowStep: string;

  email: string;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
