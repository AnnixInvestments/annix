import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export class StockAllocation {
  id: number;

  stockItem: StockItem;

  stockItemId: number;

  jobCard: JobCard;

  jobCardId: number;

  quantityUsed: number;

  photoUrl: string | null;

  notes: string | null;

  allocatedBy: string | null;

  staffMember: StaffMember | null;

  staffMemberId: number | null;

  company: StockControlCompany;

  companyId: number;

  pendingApproval: boolean;

  allowedLitres: number | null;

  approvedByManager: StaffMember | null;

  approvedByManagerId: number | null;

  approvedAt: Date | null;

  rejectedAt: Date | null;

  rejectionReason: string | null;

  undone: boolean;

  undoneAt: Date | null;

  undoneByName: string | null;

  packCount: number | null;

  litresPerPack: number | null;

  totalLitres: number | null;

  allocationType: string;

  issuedAt: Date | null;

  issuedByName: string | null;

  sourceLeftoverItem: StockItem | null;

  sourceLeftoverItemId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
