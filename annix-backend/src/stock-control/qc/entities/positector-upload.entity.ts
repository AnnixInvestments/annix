import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class PositectorUpload {
  id: number;

  company: StockControlCompany;

  companyId: number;

  originalFilename: string;

  s3FilePath: string;

  batchName: string | null;

  probeType: string | null;

  entityType: string;

  detectedFormat: string | null;

  headerData: Record<string, string>;

  readingsData: Array<{
    index: number;
    value: number;
    units: string | null;
    raw: Record<string, string>;
  }>;

  statisticsData: Record<string, string> | null;

  readingCount: number;

  linkedJobCardId: number | null;

  importRecordId: number | null;

  importedAt: Date | null;

  uploadedByName: string;

  uploadedById: number | null;

  fingerprint: string | null;

  measurementDate: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
