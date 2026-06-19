import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class JobCardLineItem {
  id: number;

  jobCardId: number;

  jobCard: JobCard;

  itemCode: string | null;

  itemDescription: string | null;

  itemNo: string | null;

  quantity: number | null;

  jtNo: string | null;

  // External / paint surface area (outer surface).
  m2: number | null;

  // Internal / rubber-lining surface area (bore + flange faces). Drives rubber quoting.
  liningM2: number | null;

  // Developed flat plate take-off for a fabricated tank/chute line, from the
  // shared Nix plateBom. Drives the rubber cutting-diagram nesting; null for
  // non-tank rows. (Legacy Postgres path — jsonb; Mongo stores it embedded.)
  plateBom: Array<{
    mark: string;
    description: string;
    thicknessMm: number;
    lengthMm: number;
    widthMm: number;
    quantity: number;
    liningThicknessMm: number;
  }> | null;

  notes: string | null;

  sortOrder: number;

  companyId: number;

  company: StockControlCompany;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
