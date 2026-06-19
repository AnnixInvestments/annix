import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { DeliveryNote } from "./delivery-note.entity";
import { InvoiceClarification } from "./invoice-clarification.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlSupplier } from "./stock-control-supplier.entity";
import { StockControlUser } from "./stock-control-user.entity";
import { SupplierInvoiceItem } from "./supplier-invoice-item.entity";

export enum InvoiceExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  NEEDS_CLARIFICATION = "needs_clarification",
  AWAITING_APPROVAL = "awaiting_approval",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  supplierName?: string;
  invoiceDate?: string;
  totalAmount?: number;
  vatAmount?: number;
  deliveryNoteNumber?: string;
  deliveryNoteNumbers?: string[];
  lineItems?: ExtractedLineItem[];
  rawText?: string;
}

export interface ExtractedLineItem {
  lineNumber: number;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitType?: string;
  discountPercent?: number;
  isPaintPartA?: boolean;
  isPaintPartB?: boolean;
  volumeLitresPerPack?: number | null;
}

export class SupplierInvoice {
  id: number;

  company: StockControlCompany;

  companyId: number;

  deliveryNote: DeliveryNote | null;

  deliveryNoteId: number | null;

  invoiceNumber: string;

  supplierName: string;

  supplier: StockControlSupplier | null;

  supplierId: number | null;

  invoiceDate: Date | null;

  totalAmount: number | null;

  vatAmount: number | null;

  scanUrl: string | null;

  extractionStatus: InvoiceExtractionStatus;

  extractedData: ExtractedInvoiceData | null;

  approvedByUser: StockControlUser | null;

  approvedBy: number | null;

  approvedAt: Date | null;

  exportedToSageAt: Date | null;

  linkedDeliveryNoteIds: number[] | null;

  linkedDeliveryNotes?: DeliveryNote[] | null;

  items: SupplierInvoiceItem[];

  clarifications: InvoiceClarification[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedApprovedByUser?: User | null;

  unifiedApprovedBy?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
