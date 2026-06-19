import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class StaffSignature {
  id: number;

  company: StockControlCompany;

  companyId: number;

  user: StockControlUser;

  userId: number;

  signatureUrl: string;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  createdAt: Date;
}
