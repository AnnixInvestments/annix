import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "../../stock-control/entities/stock-control-company.entity";
import { StockControlUser } from "../../stock-control/entities/stock-control-user.entity";

import { User } from "../../user/entities/user.entity";

export enum LeaveType {
  SICK = "sick",
  HOLIDAY = "holiday",
}

export class StaffLeaveRecord {
  id: number;

  company: StockControlCompany;

  companyId: number;

  user: StockControlUser;

  userId: number;

  leaveType: LeaveType;

  startDate: string;

  endDate: string;

  sickNoteUrl: string | null;

  sickNoteOriginalFilename: string | null;

  notes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
