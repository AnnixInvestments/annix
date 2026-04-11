import type { IssuableProductType } from "./products";

export interface RubberCompoundDto {
  id: number;
  companyId: number;
  code: string;
  name: string;
  supplierId: number | null;
  supplierName: string | null;
  compoundFamily: string;
  shoreHardness: number | null;
  densityKgPerM3: number | null;
  specificGravity: number | null;
  tempRangeMinC: number | null;
  tempRangeMaxC: number | null;
  defaultColour: string | null;
  datasheetStatus: string;
  notes: string | null;
  active: boolean;
}

export interface CreateRubberCompoundInput {
  code: string;
  name: string;
  compoundFamily?: string;
  shoreHardness?: number | null;
  densityKgPerM3?: number | null;
  specificGravity?: number | null;
  tempRangeMinC?: number | null;
  tempRangeMaxC?: number | null;
  defaultColour?: string | null;
  notes?: string | null;
}

export interface VarianceCategoryDto {
  id: number;
  companyId: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  requiresPhoto: boolean;
  requiresIncidentRef: boolean;
  notifyOnSubmit: string[];
  severity: "low" | "medium" | "high" | "critical";
  active: boolean;
}

export interface CreateVarianceCategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  requiresPhoto?: boolean;
  notifyOnSubmit?: string[];
  severity?: "low" | "medium" | "high" | "critical";
}

export interface CreateProductCategoryInput {
  productType: IssuableProductType;
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export interface StockHoldItemDto {
  id: number;
  companyId: number;
  stockTakeId: number | null;
  productId: number;
  quantity: number | null;
  reason: "damaged" | "expired" | "contaminated" | "recalled" | "wrong_spec" | "other";
  reasonNotes: string;
  photoUrl: string | null;
  flaggedByStaffId: number;
  flaggedAt: string;
  writeOffValueR: number;
  dispositionStatus:
    | "pending"
    | "scrapped"
    | "returned_to_supplier"
    | "repaired"
    | "donated"
    | "other";
  dispositionAction: string | null;
  dispositionNotes: string | null;
}

export interface ResolveDispositionInput {
  status: Exclude<StockHoldItemDto["dispositionStatus"], "pending">;
  action: string;
  notes?: string | null;
}

export interface ProductDatasheetDto {
  id: number;
  companyId: number;
  productType: "paint" | "rubber_compound" | "solution" | "consumable";
  paintProductId: number | null;
  rubberCompoundId: number | null;
  solutionProductId: number | null;
  consumableProductId: number | null;
  docType: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  revisionNumber: number;
  extractionStatus: string;
  extractedData: Record<string, unknown> | null;
  uploadedAt: string;
  uploadedByName: string | null;
  isActive: boolean;
}

export interface LocationCandidateInput {
  id: number;
  name: string;
  description?: string | null;
}

export interface LocationClassificationSuggestionDto {
  productId: number;
  productSku: string;
  productName: string;
  suggestedLocationId: number | null;
  alternativeLocationIds: number[];
  confidence: number;
  reasoning: string;
  signals: string[];
}
