import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

export class InvoiceExtractionCorrection {
  id: number;

  company: StockControlCompany;

  companyId: number;

  supplierName: string;

  invoiceItem: SupplierInvoiceItem;

  invoiceItemId: number;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  extractedDescription: string | null;

  correctedByUser: StockControlUser | null;

  correctedBy: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCorrectedByUser?: User | null;

  unifiedCorrectedBy?: number | null;

  createdAt: Date;
}
