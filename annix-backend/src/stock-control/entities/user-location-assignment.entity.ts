import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlLocation } from "./stock-control-location.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class UserLocationAssignment {
  id: number;

  company: StockControlCompany;

  companyId: number;

  user: StockControlUser;

  userId: number;

  location: StockControlLocation;

  locationId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  createdAt: Date;
}
