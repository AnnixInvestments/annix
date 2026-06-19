import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";

export enum SupplierCocType {
  COMPOUNDER = "COMPOUNDER",
  CALENDARER = "CALENDARER",
  CALENDER_ROLL = "CALENDER_ROLL",
}

export enum CocProcessingStatus {
  PENDING = "PENDING",
  EXTRACTED = "EXTRACTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
  FAILED = "FAILED",
}

export interface ExtractedCocSpecifications {
  shoreAMin?: number | null;
  shoreAMax?: number | null;
  shoreANominal?: number | null;
  specificGravityMin?: number | null;
  specificGravityMax?: number | null;
  specificGravityNominal?: number | null;
  reboundMin?: number | null;
  reboundMax?: number | null;
  reboundNominal?: number | null;
  tearStrengthMin?: number | null;
  tearStrengthMax?: number | null;
  tearStrengthNominal?: number | null;
  tensileMin?: number | null;
  tensileMax?: number | null;
  tensileNominal?: number | null;
  elongationMin?: number | null;
  elongationMax?: number | null;
  elongationNominal?: number | null;
}

// One row of the batch table's "Count" / "Median" summary block, keyed by the
// same numeric field names as a batch. Used to cross-check extracted batches.
export interface BatchStatRow {
  shoreA?: number | null;
  specificGravity?: number | null;
  reboundPercent?: number | null;
  tearStrengthKnM?: number | null;
  tensileStrengthMpa?: number | null;
  elongationPercent?: number | null;
  rheometerSMin?: number | null;
  rheometerSMax?: number | null;
  rheometerTs2?: number | null;
  rheometerTc90?: number | null;
}

export interface ExtractedCocData {
  cocNumber?: string;
  productionDate?: string;
  customerName?: string;
  compoundCode?: string | null;
  compoundDescription?: string;
  batchNumbers?: string[];
  rollNumbers?: string[];
  orderNumber?: string;
  ticketNumber?: string;
  hasGraph?: boolean;
  graphPageNumber?: number | null;
  approverNames?: string[];
  specifications?: ExtractedCocSpecifications;
  batches?: Array<{
    batchNumber: string;
    shoreA?: number;
    specificGravity?: number;
    reboundPercent?: number;
    tearStrengthKnM?: number;
    tensileStrengthMpa?: number;
    elongationPercent?: number;
    rheometerSMin?: number;
    rheometerSMax?: number;
    rheometerTs2?: number;
    rheometerTc90?: number;
    passFailStatus?: string;
  }>;
  batchStats?: {
    count?: BatchStatRow | null;
    median?: BatchStatRow | null;
  } | null;
  linkedCompounderCocIds?: number[];
  compoundCodingId?: number | null;
  parsedCompoundInfo?: Record<string, any> | null;
  deliveryNoteNumber?: string | null;
  waybillNumber?: string | null;
  rolls?: Array<{
    rollNumber: string;
    shoreA?: number | null;
  }>;
  sharedDensity?: number | null;
  sharedTensile?: number | null;
  sharedElongation?: number | null;
  shoreANominal?: number | null;
  shoreALimits?: string | null;
  densityNominal?: number | null;
  densityLimits?: string | null;
  tensileNominal?: number | null;
  tensileLimits?: string | null;
  elongationNominal?: number | null;
  elongationLimits?: string | null;
  preparedBy?: string | null;
  approvedByName?: string | null;
  documentDate?: string | null;
}

export class RubberSupplierCoc {
  id: number;

  firebaseUid: string;

  cocType: SupplierCocType;

  supplierCompanyId: number;

  supplierCompany: RubberCompany;

  documentPath: string;

  graphPdfPath: string | null;

  cocNumber: string | null;

  productionDate: Date | null;

  compoundCode: string | null;

  orderNumber: string | null;

  ticketNumber: string | null;

  processingStatus: CocProcessingStatus;

  extractedData: ExtractedCocData | null;

  reviewNotes: string | null;

  approvedBy: string | null;

  approvedAt: Date | null;

  linkedDeliveryNoteId: number | null;

  linkedCalenderRollCocId: number | null;

  linkedCalenderRollCoc: RubberSupplierCoc | null;

  exportedToSageAt: Date | null;

  createdBy: string | null;

  version: number;

  previousVersionId: number | null;

  previousVersion: RubberSupplierCoc | null;

  versionStatus: DocumentVersionStatus;

  // SHA-256 of the source PDF. Used to skip creating a CoC when the exact
  // same document has already been ingested (e.g. re-forwarded email).
  documentHash: string | null;

  createdAt: Date;

  updatedAt: Date;
}
