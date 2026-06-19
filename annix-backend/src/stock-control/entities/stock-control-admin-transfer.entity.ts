import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum AdminTransferStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export class StockControlAdminTransfer {
  id: number;

  company: StockControlCompany;

  companyId: number;

  initiatedBy: StockControlUser;

  initiatedById: number;

  targetEmail: string;

  token: string;

  newRoleForInitiator: string | null;

  status: AdminTransferStatus;

  expiresAt: Date;

  acceptedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedInitiatedBy?: User | null;

  unifiedInitiatedById?: number | null;

  createdAt: Date;
}
