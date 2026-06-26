import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";

export enum TaxInvoiceType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
}

export enum TaxInvoiceStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
  FAILED = "FAILED",
}

// A supplier credit note is not always a physical return of rolls — it can be a
// pure financial credit (price adjustment, rebate, short delivery). Only a
// PHYSICAL_RETURN removes rolls from stock / unwinds allocations; a
// FINANCIAL_ONLY credit affects accounting only and never touches stock.
export enum CreditNoteType {
  PHYSICAL_RETURN = "PHYSICAL_RETURN",
  FINANCIAL_ONLY = "FINANCIAL_ONLY",
}

export interface ExtractedRollDetail {
  rollNumber: string;
  weightKg: number | null;
}

export interface ExtractedTaxInvoiceLineItem {
  description: string;
  compoundCode?: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  rolls?: ExtractedRollDetail[] | null;
}

export interface ExtractedTaxInvoiceData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  companyName: string | null;
  productSummary: string | null;
  productQuantity?: number | null;
  productUnit?: string | null;
  deliveryNoteRef: string | null;
  orderNumber: string | null;
  lineItems: ExtractedTaxInvoiceLineItem[];
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  originalInvoiceRef?: string | null;
  rollNumbers?: string[] | null;
  sourcePages?: number[] | null;
}

export class RubberTaxInvoice {
  id: number;

  firebaseUid: string;

  invoiceNumber: string;

  invoiceDate: Date | null;

  invoiceType: TaxInvoiceType;

  companyId: number;

  company: RubberCompany;

  documentPath: string | null;

  status: TaxInvoiceStatus;

  extractedData: ExtractedTaxInvoiceData | null;

  totalAmount: string | null;

  vatAmount: string | null;

  createdBy: string | null;

  exportedToSageAt: Date | null;

  sageInvoiceId: number | null;

  postedToSageAt: Date | null;

  version: number;

  previousVersionId: number | null;

  previousVersion: RubberTaxInvoice | null;

  versionStatus: DocumentVersionStatus;

  isCreditNote: boolean;

  // Whether a credit note physically returns rolls or is a financial-only
  // credit. Null until a human classifies it; stock effects only run for
  // PHYSICAL_RETURN.
  creditNoteType: CreditNoteType | null;

  originalInvoiceId: number | null;

  originalInvoice: RubberTaxInvoice | null;

  creditNoteRollNumbers: string[];

  // Rolls returned on this (supplier) credit note that were already shipped to a
  // customer on an AU CoC + CDN. Their certificate is already with the customer,
  // so the system never silently un-ships them — it records them here and the UI
  // prompts the user to raise a customer credit note. Cleared once handled.
  customerCreditNeeded: {
    rollNumber: string;
    auCocId: number;
    customerDeliveryNoteId: number;
  }[];

  // Rolls on a returned (PHYSICAL_RETURN) credit note that could not be fully
  // processed at approval, with a reason code, so the operator is shown what
  // still needs attention: WRONG_SUPPLIER (skipped — belongs to another
  // supplier, likely an OCR mis-read), NOT_FOUND (roll not in stock), or
  // MANUAL_KG (returned but kg not auto-deducted — manual adjustment needed).
  returnExceptions: { rollNumber: string; reason: string }[];

  linkedAuCocId: number | null;

  // For supplier credit notes: the Calender Roll supplier CoC the credited
  // rolls arrived on (rubber_supplier_cocs.id).
  linkedCalenderRollCocId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
