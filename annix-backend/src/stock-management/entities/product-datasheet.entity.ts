export type ProductDatasheetType = "paint" | "rubber_compound" | "solution" | "consumable";

export type ProductDatasheetDocType = "tds" | "sds" | "msds" | "product_info" | "application_guide";

export type ProductDatasheetExtractionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "manual_only";

export class ProductDatasheet {
  id: number;

  companyId: number;

  productType: ProductDatasheetType;

  paintProductId: number | null;

  rubberCompoundId: number | null;

  solutionProductId: number | null;

  consumableProductId: number | null;

  docType: ProductDatasheetDocType;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  mimeType: string;

  revisionNumber: number;

  issuedAt: string | null;

  expiresAt: string | null;

  extractionStatus: ProductDatasheetExtractionStatus;

  extractionStartedAt: Date | null;

  extractionCompletedAt: Date | null;

  extractedData: Record<string, unknown> | null;

  extractionModel: string | null;

  extractionNotes: string | null;

  uploadedAt: Date;

  uploadedById: number | null;

  uploadedByName: string | null;

  isActive: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
