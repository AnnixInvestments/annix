import { User } from "../../user/entities/user.entity";
import { SupplierProfile } from "./supplier-profile.entity";

export enum SupplierDocumentType {
  REGISTRATION_CERT = "registration_cert",
  VAT_CERT = "vat_cert",
  TAX_CLEARANCE = "tax_clearance",
  BEE_CERT = "bee_cert",
  ISO_CERT = "iso_cert",
  INSURANCE = "insurance",
  OTHER = "other",
}

export enum SupplierDocumentValidationStatus {
  PENDING = "pending",
  VALID = "valid",
  INVALID = "invalid",
  FAILED = "failed",
  MANUAL_REVIEW = "manual_review",
}

export class SupplierDocument {
  id: number;

  supplier: SupplierProfile;

  supplierId: number;

  documentType: SupplierDocumentType;

  fileName: string;

  filePath: string;

  fileSize: number;

  mimeType: string;

  uploadedAt: Date;

  validationStatus: SupplierDocumentValidationStatus;

  validationNotes: string | null;

  reviewedBy: User;

  reviewedById: number;

  reviewedAt: Date;

  expiryDate: Date | null;

  isExpired: boolean;

  expiryWarningSentAt: Date | null;

  expiryNotificationSentAt: Date | null;

  isRequired: boolean;

  ocrExtractedData: {
    vatNumber?: string;
    registrationNumber?: string;
    companyName?: string;
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    beeLevel?: number;
    beeExpiryDate?: string;
    rawText?: string;
    confidence?: string;
  } | null;

  ocrProcessedAt: Date | null;

  ocrFailed: boolean;

  verificationConfidence: number | null;

  allFieldsMatch: boolean | null;

  fieldResults:
    | {
        fieldName: string;
        expected: string;
        extracted: string;
        matches: boolean;
        similarity: number;
      }[]
    | null;

  createdAt: Date;

  updatedAt: Date;
}
