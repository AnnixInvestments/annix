import { Company } from "./company.entity";
import { Contact } from "./contact.entity";

export enum InvoiceSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum InvoiceType {
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
}

export enum InvoiceExtractionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION",
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum InvoiceStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
}

export class PlatformInvoice {
  id: number;

  companyId: number;

  company: Company;

  sourceModule: InvoiceSourceModule;

  invoiceType: InvoiceType;

  invoiceNumber: string;

  invoiceDate: Date | null;

  supplierName: string | null;

  supplierContactId: number | null;

  supplierContact: Contact | null;

  totalAmount: number | null;

  vatAmount: number | null;

  documentPath: string | null;

  extractionStatus: InvoiceExtractionStatus;

  status: InvoiceStatus;

  extractedData: Record<string, unknown> | null;

  approvedBy: string | null;

  approvedAt: Date | null;

  exportedToSageAt: Date | null;

  sageInvoiceId: number | null;

  postedToSageAt: Date | null;

  createdBy: string | null;

  linkedDeliveryNoteIds: number[] | null;

  version: number;

  previousVersionId: number | null;

  versionStatus: string;

  firebaseUid: string | null;

  legacyScInvoiceId: number | null;

  legacyRubberInvoiceId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
