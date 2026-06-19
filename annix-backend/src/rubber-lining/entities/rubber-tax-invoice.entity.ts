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

  originalInvoiceId: number | null;

  originalInvoice: RubberTaxInvoice | null;

  creditNoteRollNumbers: string[];

  linkedAuCocId: number | null;

  // For supplier credit notes: the Calender Roll supplier CoC the credited
  // rolls arrived on (rubber_supplier_cocs.id).
  linkedCalenderRollCocId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
