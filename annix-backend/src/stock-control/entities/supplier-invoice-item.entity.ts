import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";

export enum InvoiceItemMatchStatus {
  MATCHED = "matched",
  UNMATCHED = "unmatched",
  CLARIFICATION_NEEDED = "clarification_needed",
  MANUALLY_MATCHED = "manually_matched",
  NEW_ITEM_CREATED = "new_item_created",
}

export class SupplierInvoiceItem {
  id: number;

  invoice: SupplierInvoice;

  invoiceId: number;

  company: StockControlCompany;

  companyId: number;

  lineNumber: number;

  extractedDescription: string | null;

  extractedSku: string | null;

  quantity: number;

  unitPrice: number | null;

  unitType: string | null;

  discountPercent: number | null;

  matchStatus: InvoiceItemMatchStatus;

  matchConfidence: number | null;

  stockItem: StockItem | null;

  stockItemId: number | null;

  isPartA: boolean;

  isPartB: boolean;

  linkedItem: SupplierInvoiceItem | null;

  linkedItemId: number | null;

  priceUpdated: boolean;

  previousPrice: number | null;

  rollNumbers: string[] | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
