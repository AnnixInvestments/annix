import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockIssuance } from "./stock-issuance.entity";

export enum IssuanceSessionScope {
  SINGLE_JC = "single_jc",
  CPO_BATCH = "cpo_batch",
}

export enum IssuanceSessionStatus {
  ACTIVE = "active",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  UNDONE = "undone",
}

export class IssuanceSession {
  id: number;

  company: StockControlCompany;

  companyId: number;

  cpo: CustomerPurchaseOrder | null;

  cpoId: number | null;

  issuerStaff: StaffMember;

  issuerStaffId: number;

  recipientStaff: StaffMember;

  recipientStaffId: number;

  scope: IssuanceSessionScope;

  status: IssuanceSessionStatus;

  jobCardIds: number[];

  notes: string | null;

  issuedByUser: StockControlUser | null;

  issuedByUserId: number | null;

  issuedByName: string | null;

  issuedAt: Date;

  approvedByManager: StaffMember | null;

  approvedByManagerId: number | null;

  approvedAt: Date | null;

  rejectedAt: Date | null;

  rejectionReason: string | null;

  undoneAt: Date | null;

  undoneByName: string | null;

  issuances: StockIssuance[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedIssuedByUser?: User | null;

  unifiedIssuedByUserId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
