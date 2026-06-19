import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

export class DispatchScan {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  stockItem: StockItem;

  stockItemId: number;

  allocation: StockAllocation | null;

  allocationId: number | null;

  quantityDispatched: number;

  scannedBy: StockControlUser | null;

  scannedById: number | null;

  scannedByName: string | null;

  dispatchNotes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedScannedBy?: User | null;

  unifiedScannedById?: number | null;

  scannedAt: Date;
}
