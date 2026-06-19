import { Company } from "./company.entity";
import { Contact } from "./contact.entity";

export enum CertificateSourceModule {
  STOCK_CONTROL = "stock-control",
  AU_RUBBER = "au-rubber",
}

export enum CertificateCategory {
  COA = "COA",
  COC = "COC",
  COMPOUNDER = "COMPOUNDER",
  CALENDARER = "CALENDARER",
  CALENDER_ROLL = "CALENDER_ROLL",
  CALIBRATION = "CALIBRATION",
}

export enum CertificateProcessingStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
}

export class PlatformCertificate {
  id: number;

  companyId: number;

  company: Company;

  sourceModule: CertificateSourceModule;

  certificateCategory: CertificateCategory;

  certificateNumber: string | null;

  batchNumber: string | null;

  supplierName: string | null;

  supplierContactId: number | null;

  supplierContact: Contact | null;

  filePath: string | null;

  graphPdfPath: string | null;

  originalFilename: string | null;

  fileSizeBytes: number | null;

  mimeType: string | null;

  description: string | null;

  compoundCode: string | null;

  productionDate: Date | null;

  expiryDate: Date | null;

  processingStatus: CertificateProcessingStatus;

  extractedData: Record<string, unknown> | null;

  reviewNotes: string | null;

  approvedBy: string | null;

  approvedAt: Date | null;

  uploadedByName: string | null;

  exportedToSageAt: Date | null;

  linkedDeliveryNoteId: number | null;

  linkedCalenderRollCocId: number | null;

  stockItemId: number | null;

  jobCardId: number | null;

  orderNumber: string | null;

  ticketNumber: string | null;

  version: number;

  previousVersionId: number | null;

  versionStatus: string;

  firebaseUid: string | null;

  legacyScCertificateId: number | null;

  legacyScCalibrationId: number | null;

  legacyRubberCocId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
