import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";

export type SupplierDocumentType =
  | "bee_certificate"
  | "tax_clearance"
  | "iso_certificate"
  | "insurance"
  | "msds"
  | "bank_confirmation"
  | "company_registration"
  | "vat_registration"
  | "other";

export class SupplierDocument {
  id: number;

  company: StockControlCompany;

  companyId: number;

  supplier: StockControlSupplier;

  supplierId: number;

  docType: SupplierDocumentType;

  docNumber: string | null;

  issuedAt: string | null;

  expiresAt: string | null;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  mimeType: string;

  notes: string | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
