import { RubberCompany } from "./rubber-company.entity";
import { RubberPoExtractionRegion } from "./rubber-po-extraction-region.entity";

export class RubberPoExtractionTemplate {
  id: number;

  companyId: number;

  company: RubberCompany;

  formatHash: string;

  templateName: string | null;

  isActive: boolean;

  useCount: number;

  successCount: number;

  createdByUserId: number | null;

  regions: RubberPoExtractionRegion[];

  createdAt: Date;

  updatedAt: Date;
}
