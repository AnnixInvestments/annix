import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class PushSubscription {
  id: number;

  user: StockControlUser;

  userId: number;

  company: StockControlCompany;

  companyId: number;

  endpoint: string;

  keyP256dh: string;

  keyAuth: string;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  createdAt: Date;
}
