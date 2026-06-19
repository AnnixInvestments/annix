import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export interface CdnLineMatch {
  lineItemId: number | null;
  cdnDescription: string;
  cdnQuantity: number | null;
  matchedDescription: string | null;
  matchedQuantity: number | null;
  confidence: number;
  dispatched: boolean;
}

export class DispatchCdn {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  filePath: string;

  originalFilename: string;

  mimeType: string;

  cdnNumber: string | null;

  lineMatches: CdnLineMatch[] | null;

  aiRawResponse: string | null;

  uploadedBy: StockControlUser | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUploadedBy?: User | null;

  unifiedUploadedById?: number | null;

  createdAt: Date;
}
