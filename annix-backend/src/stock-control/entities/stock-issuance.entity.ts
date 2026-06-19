import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { IssuanceSession } from "./issuance-session.entity";
import { JobCard } from "./job-card.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";

export class StockIssuance {
  id: number;

  company: StockControlCompany;

  companyId: number;

  stockItem: StockItem;

  stockItemId: number;

  issuerStaff: StaffMember;

  issuerStaffId: number;

  recipientStaff: StaffMember;

  recipientStaffId: number;

  jobCard: JobCard | null;

  jobCardId: number | null;

  session: IssuanceSession | null;

  sessionId: number | null;

  cpo: CustomerPurchaseOrder | null;

  cpoId: number | null;

  quantity: number;

  notes: string | null;

  issuedByUser: StockControlUser | null;

  issuedByUserId: number | null;

  issuedByName: string | null;

  issuedAt: Date;

  undone: boolean;

  undoneAt: Date | null;

  undoneByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedIssuedByUser?: User | null;

  unifiedIssuedByUserId?: number | null;

  createdAt: Date;
}
