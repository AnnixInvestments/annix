import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class QcBatchAssignment {
  id: number;

  company: StockControlCompany;

  companyId: number;

  batchNumber: string;

  fieldKey: string;

  category: string;

  label: string;

  lineItemId: number;

  jobCardId: number;

  cpoId: number | null;

  positectorUploadId: number | null;

  supplierCertificateId: number | null;

  notApplicable: boolean;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
