import { User } from "../../user/entities/user.entity";
import { CustomerProfile } from "./customer-profile.entity";

export enum CustomerDocumentType {
  REGISTRATION_CERT = "registration_cert",
  VAT_CERT = "vat_cert",
  TAX_CLEARANCE = "tax_clearance",
  BEE_CERT = "bee_cert",
  INSURANCE = "insurance",
  PROOF_OF_ADDRESS = "proof_of_address",
  OTHER = "other",
}

export enum CustomerDocumentValidationStatus {
  PENDING = "pending",
  VALID = "valid",
  INVALID = "invalid",
  FAILED = "failed",
  MANUAL_REVIEW = "manual_review",
}

export class CustomerDocument {
  id: number;

  customer: CustomerProfile;

  customerId: number;

  documentType: CustomerDocumentType;

  fileName: string;

  filePath: string;

  fileSize: number;

  mimeType: string;

  uploadedAt: Date;

  validationStatus: CustomerDocumentValidationStatus;

  validationNotes: string | null;

  reviewedBy: User;

  reviewedById: number | null;

  reviewedAt: Date | null;

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
