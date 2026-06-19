import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class DispatchLoadPhoto {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  filePath: string;

  originalFilename: string;

  mimeType: string;

  caption: string | null;

  uploadedBy: StockControlUser | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUploadedBy?: User | null;

  unifiedUploadedById?: number | null;

  createdAt: Date;
}
