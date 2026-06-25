import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum DeliveryNoteType {
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

export enum DeliveryNoteStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  APPROVED = "APPROVED",
  LINKED = "LINKED",
  STOCK_CREATED = "STOCK_CREATED",
  FAILED = "FAILED",
}

// How a delivery note first entered the system. EMAIL means it was ingested
// automatically from an inbound email (e.g. a Sage-generated customer CDN);
// UPLOAD means a user uploaded it through the portal (e.g. a signed POD scan).
export enum DeliveryNoteIngestionSource {
  EMAIL = "EMAIL",
  UPLOAD = "UPLOAD",
}

export interface ExtractedDeliveryNoteRoll {
  rollNumber: string | null;
  compoundCode?: string | null;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
  deliveryNoteNumber?: string | null;
  deliveryDate?: string | null;
  customerName?: string | null;
  customerReference?: string | null;
  supplierName?: string | null;
  pageNumber?: number;
  sourcePages?: number[] | null;
  specificGravity?: number | null;
}

export interface ExtractedDeliveryNoteData {
  deliveryNoteNumber?: string | null;
  deliveryDate?: string | null;
  supplierName?: string | null;
  customerName?: string | null;
  customerReference?: string | null;
  batchRange?: string | null;
  totalWeightKg?: number | null;
  rolls?: ExtractedDeliveryNoteRoll[];
  userCorrected?: boolean;
}

export interface ExtractedCustomerDeliveryNoteLineItem {
  lineNumber?: number;
  compoundCode?: string;
  compoundType?: string;
  compoundDescription?: string;
  thicknessMm?: number;
  widthMm?: number;
  lengthM?: number;
  quantity?: number;
  rollWeightKg?: number;
  weightPerRollKg?: number;
  specificGravity?: number;
  rollNumber?: string;
  actualWeightKg?: number;
  cocBatchNumbers?: string[];
  itemCategory?: string;
  description?: string;
}

export interface ExtractedCustomerDeliveryNoteData {
  deliveryNoteNumber?: string;
  customerReference?: string;
  deliveryDate?: string;
  customerName?: string;
  supplierName?: string;
  pageInfo?: { currentPage?: number; totalPages?: number };
  sourcePages?: number[];
  lineItems?: ExtractedCustomerDeliveryNoteLineItem[];
}

export interface ExtractedCustomerDeliveryNotePodPage {
  pageNumber: number;
  relatedDnNumber: string | null;
}

export interface ExtractedCustomerDeliveryNotesResult {
  deliveryNotes: ExtractedCustomerDeliveryNoteData[];
  podPages?: ExtractedCustomerDeliveryNotePodPage[];
}

export class RubberDeliveryNote {
  id: number;

  firebaseUid: string;

  deliveryNoteType: DeliveryNoteType;

  deliveryNoteNumber: string;

  deliveryDate: Date | null;

  customerReference: string | null;

  supplierCompanyId: number;

  supplierCompany: RubberCompany;

  documentPath: string | null;

  // The full original (pre-slice) PDF this DN was extracted from. Split/sibling
  // DNs have documentPath replaced by a per-DN slice; if that slice is ever
  // missing from storage, the document viewer falls back to this source PDF.
  sourceDocumentPath: string | null;

  status: DeliveryNoteStatus;

  linkedCocId: number | null;

  linkedCoc: RubberSupplierCoc | null;

  extractedData: ExtractedDeliveryNoteData | null;

  createdBy: string | null;

  version: number;

  previousVersionId: number | null;

  previousVersion: RubberDeliveryNote | null;

  versionStatus: DocumentVersionStatus;

  stockCategory: string | null;

  // Customer-direction CDNs ingested unsigned from email still require the
  // physically-signed Proof of Delivery to be uploaded later. requiresSignedPod
  // marks the obligation; signedPodReceived flips true once the signed version
  // supersedes this one (see RubberDocumentVersioningService.authorizeVersion).
  requiresSignedPod: boolean;

  signedPodReceived: boolean;

  ingestionSource: DeliveryNoteIngestionSource | null;

  podPageNumbers: number[] | null;

  sourcePageNumbers: number[] | null;

  siblingsBackfilledAt: Date | null;

  // Set when the "supplier CoC overdue" warning email has been sent for this
  // supplier DN, so the daily reminder cron warns about it exactly once.
  cocOverdueWarnedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
