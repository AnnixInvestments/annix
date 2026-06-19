import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { SupplierCertificate } from "../../entities/supplier-certificate.entity";

export class QcDefelskoBatch {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  category: string;

  fieldKey: string;

  label: string;

  batchNumber: string | null;

  notApplicable: boolean;

  capturedByName: string;

  capturedById: number | null;

  supplierCertificate: SupplierCertificate | null;

  supplierCertificateId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
