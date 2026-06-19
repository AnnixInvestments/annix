import { Company } from "../../platform/entities/company.entity";
import { DeliveryNoteItem } from "./delivery-note-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { SupplierInvoice } from "./supplier-invoice.entity";

export interface ExtractedDeliveryData {
  deliveryNumber?: string;
  supplierName?: string;
  receivedDate?: string;
  lineItems?: {
    description: string;
    quantity: number;
    sku?: string;
    rollNumber?: string;
    weightKg?: number;
  }[];
  rawText?: string;
}

export const SdnStatus = {
  PENDING_REVIEW: "PENDING_REVIEW",
  CONFIRMED: "CONFIRMED",
  STOCK_LINKED: "STOCK_LINKED",
} as const;

export type SdnStatusType = (typeof SdnStatus)[keyof typeof SdnStatus];

export class DeliveryNote {
  id: number;

  deliveryNumber: string;

  supplierName: string;

  supplier: StockControlSupplier | null;

  supplierId: number | null;

  receivedDate: Date | null;

  notes: string | null;

  photoUrl: string | null;

  receivedBy: string | null;

  company: StockControlCompany;

  companyId: number;

  items: DeliveryNoteItem[];

  sdnStatus: string;

  extractionStatus: string | null;

  extractedData: ExtractedDeliveryData | null;

  invoices: SupplierInvoice[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
