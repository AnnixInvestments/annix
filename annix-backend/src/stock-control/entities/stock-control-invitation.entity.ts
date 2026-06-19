import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum StockControlInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export class StockControlInvitation {
  id: number;

  company: StockControlCompany;

  companyId: number;

  invitedBy: StockControlUser;

  invitedById: number;

  email: string;

  token: string;

  role: string;

  status: StockControlInvitationStatus;

  expiresAt: Date;

  acceptedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedInvitedBy?: User | null;

  unifiedInvitedById?: number | null;

  createdAt: Date;
}
