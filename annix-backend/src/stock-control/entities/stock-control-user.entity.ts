import { Company } from "../../platform/entities/company.entity";
import { StaffMember } from "./staff-member.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum StockControlRole {
  STOREMAN = "storeman",
  ACCOUNTS = "accounts",
  MANAGER = "manager",
  ADMIN = "admin",
}

export class StockControlUser {
  id: number;

  email: string;

  passwordHash: string;

  name: string;

  role: string;

  emailVerified: boolean;

  emailVerificationToken: string | null;

  emailVerificationExpires: Date | null;

  resetPasswordToken: string | null;

  resetPasswordExpires: Date | null;

  hideTooltips: boolean;

  emailNotificationsEnabled: boolean;

  pushNotificationsEnabled: boolean;

  company: StockControlCompany;

  companyId: number;

  linkedStaff: StaffMember | null;

  linkedStaffId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUserId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
