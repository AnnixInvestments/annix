import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

export enum PriceChangeReason {
  INVOICE = "invoice",
  MANUAL = "manual",
  IMPORT = "import",
}

export class StockPriceHistory {
  id: number;

  stockItem: StockItem;

  stockItemId: number;

  company: StockControlCompany;

  companyId: number;

  oldPrice: number | null;

  newPrice: number;

  changeReason: PriceChangeReason;

  referenceType: string | null;

  referenceId: number | null;

  supplierName: string | null;

  changedByUser: StockControlUser | null;

  changedBy: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedChangedByUser?: User | null;

  unifiedChangedBy?: number | null;

  createdAt: Date;
}
