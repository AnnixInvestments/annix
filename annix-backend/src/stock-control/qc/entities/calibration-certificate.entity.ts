import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class CalibrationCertificate {
  id: number;

  company: StockControlCompany;

  companyId: number;

  equipmentName: string;

  equipmentIdentifier: string | null;

  certificateNumber: string | null;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  mimeType: string;

  description: string | null;

  expiryDate: string;

  expiryWarningSentAt: Date | null;

  expiryNotificationSentAt: Date | null;

  isActive: boolean;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
