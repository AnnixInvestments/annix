import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StaffMember } from "./staff-member.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export class StockReturn {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  allocation: StockAllocation;

  allocationId: number;

  originalStockItem: StockItem;

  originalStockItemId: number;

  leftoverStockItem: StockItem | null;

  leftoverStockItemId: number | null;

  litresReturned: number;

  costReduction: number;

  returnedByName: string | null;

  returnedByStaff: StaffMember | null;

  returnedByStaffId: number | null;

  notes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
