import { Company } from "./company.entity";
import { Contact } from "./contact.entity";
import { DeliveryNoteItem } from "./delivery-note-item.entity";

export enum DeliveryNoteSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum DeliveryNoteType {
  GENERAL = "GENERAL",
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

export enum DeliveryNoteStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
  LINKED = "LINKED",
  STOCK_CREATED = "STOCK_CREATED",
}

export enum ExtractionStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export class PlatformDeliveryNote {
  id: number;

  companyId: number;

  company: Company;

  sourceModule: DeliveryNoteSourceModule;

  deliveryNumber: string;

  deliveryNoteType: DeliveryNoteType;

  status: DeliveryNoteStatus;

  supplierName: string | null;

  supplierContactId: number | null;

  supplierContact: Contact | null;

  deliveryDate: Date | null;

  customerReference: string | null;

  notes: string | null;

  documentPath: string | null;

  receivedBy: string | null;

  createdBy: string | null;

  extractionStatus: ExtractionStatus | null;

  extractedData: Record<string, unknown> | null;

  linkedCocId: number | null;

  version: number;

  previousVersionId: number | null;

  versionStatus: string;

  stockCategory: string | null;

  podPageNumbers: number[] | null;

  firebaseUid: string | null;

  legacyScDeliveryNoteId: number | null;

  legacyRubberDeliveryNoteId: number | null;

  items: DeliveryNoteItem[];

  createdAt: Date;

  updatedAt: Date;
}
