import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class WorkflowStepAssignment {
  id: number;

  company: StockControlCompany;

  companyId: number;

  workflowStep: string;

  user: StockControlUser;

  userId: number;

  isPrimary: boolean;

  secondaryUser: StockControlUser | null;

  secondaryUserId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  unifiedSecondaryUser?: User | null;

  unifiedSecondaryUserId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
