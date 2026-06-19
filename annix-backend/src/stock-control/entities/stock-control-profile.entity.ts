import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StaffMember } from "./staff-member.entity";

export class StockControlProfile {
  id: number;

  user: User;

  userId: number;

  company: Company;

  companyId: number;

  hideTooltips: boolean;

  emailNotificationsEnabled: boolean;

  pushNotificationsEnabled: boolean;

  linkedStaff: StaffMember | null;

  linkedStaffId: number | null;

  legacyScUserId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
