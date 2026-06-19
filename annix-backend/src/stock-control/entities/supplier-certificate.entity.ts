import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { StockItem } from "./stock-item.entity";

export class SupplierCertificate {
  id: number;

  company: StockControlCompany;

  companyId: number;

  supplier: StockControlSupplier;

  supplierId: number;

  stockItem: StockItem | null;

  stockItemId: number | null;

  jobCard: JobCard | null;

  jobCardId: number | null;

  certificateType: string;

  batchNumber: string;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  mimeType: string;

  description: string | null;

  expiryDate: string | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
