import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { StockItem } from "./stock-item.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

export enum ClarificationType {
  ITEM_MATCH = "item_match",
  PRICE_CONFIRMATION = "price_confirmation",
  NEW_ITEM = "new_item",
  PART_LINKING = "part_linking",
}

export enum ClarificationStatus {
  PENDING = "pending",
  ANSWERED = "answered",
  SKIPPED = "skipped",
}

export interface ClarificationContext {
  suggestedMatches?: SuggestedMatch[];
  priceChangePercent?: number;
  oldPrice?: number;
  newPrice?: number;
  extractedDescription?: string;
  extractedSku?: string;
  isPartA?: boolean;
  isPartB?: boolean;
  potentialLinkedItem?: {
    id: number;
    description: string;
    isPartA: boolean;
  };
}

export interface SuggestedMatch {
  stockItemId: number;
  stockItemName: string;
  stockItemSku: string;
  confidence: number;
  currentPrice: number;
}

export class InvoiceClarification {
  id: number;

  invoice: SupplierInvoice;

  invoiceId: number;

  invoiceItem: SupplierInvoiceItem | null;

  invoiceItemId: number | null;

  company: StockControlCompany;

  companyId: number;

  clarificationType: ClarificationType;

  status: ClarificationStatus;

  question: string;

  context: ClarificationContext | null;

  selectedStockItem: StockItem | null;

  selectedStockItemId: number | null;

  responseData: Record<string, unknown> | null;

  answeredByUser: StockControlUser | null;

  answeredBy: number | null;

  answeredAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedAnsweredByUser?: User | null;

  unifiedAnsweredBy?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
