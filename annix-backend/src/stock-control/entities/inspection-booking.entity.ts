import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class InspectionBooking {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  inspectionDate: string;

  startTime: string;

  endTime: string;

  inspectorEmail: string;

  inspectorName: string | null;

  notes: string | null;

  status: string;

  bookedBy: StockControlUser | null;

  bookedById: number | null;

  bookedByName: string | null;

  completedAt: Date | null;

  completedBy: StockControlUser | null;

  completedById: number | null;

  completedByName: string | null;

  responseToken: string | null;

  tokenExpiresAt: Date | null;

  proposedDate: string | null;

  proposedStartTime: string | null;

  proposedEndTime: string | null;

  proposedNote: string | null;

  proposedAt: Date | null;

  respondedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedBookedBy?: User | null;

  unifiedBookedById?: number | null;

  unifiedCompletedBy?: User | null;

  unifiedCompletedById?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
