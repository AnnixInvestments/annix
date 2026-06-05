"use client";

import { isObject } from "es-toolkit/compat";
import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { anyPortalAuthHeaders } from "@/app/lib/api/portalTokenStores";
import { log } from "@/app/lib/logger";
import { browserBaseUrl } from "@/lib/api-config";

/**
 * Resolves the Authorization header for Nix API calls by delegating to
 * the canonical PortalTokenStore registry — whichever portal token store
 * (Stock Control, Customer, Supplier, Admin, etc.) currently holds an
 * authenticated session wins. Avoids maintaining a parallel list of
 * localStorage key names that drifts from the source of truth.
 */
function resolveNixAuthHeaders(): Record<string, string> {
  return anyPortalAuthHeaders();
}

/**
 * Standardised error handler for nixApi fetch responses. On 401 it fires
 * the global sessionExpiredEvent so the SessionExpiredModal in the root
 * layout shows a branded "session expired — please sign in again" prompt
 * instead of every caller surfacing a cryptic toast like
 * `{"message":"Invalid token","statusCode":401}`. Throws a typed Error
 * so React Query / try/catch handlers can still react.
 */
async function failNixResponse(response: Response, action: string): Promise<never> {
  const errorText = await response.text();
  if (response.status === 401) {
    sessionExpiredEvent.emit();
    throw new Error(`Session expired — please sign in again to ${action}.`);
  }
  throw new Error(`Failed to ${action}: ${errorText}`);
}

export interface NixExtractedPlateBomRow {
  mark?: string;
  description?: string;
  thicknessMm?: number;
  lengthMm?: number;
  widthMm?: number;
  quantity?: number;
  weightKg?: number;
  areaM2?: number;
  liningThicknessMm?: number;
}

export type NixExtractedItemType =
  | "pipe"
  | "bend"
  | "reducer"
  | "tee"
  | "lateral"
  | "flange"
  | "end_cap"
  | "puddle_pipe"
  | "expansion_joint"
  | "tank_chute"
  | "valve"
  | "pump"
  | "instrument"
  | "boot"
  | "wrapping"
  | "consumable"
  | "upvc"
  | "skid"
  | "unknown";

export type NixExtractedItemAction = "supply" | "install" | "dismantle" | "supply_install";

// Product family inferred by Nix from material keywords / SDR / Sch
// signals. Drives the frontend converter's choice of entry shape:
// "hdpe"/"pvc"/"upvc" pipes use SDR + grade + PN, "steel" pipes use
// Schedule + WT + steel-spec, null falls back to steel for backwards
// compatibility.
export type NixProductType = "steel" | "hdpe" | "pvc" | "upvc" | null;

export interface NixExtractedItem {
  rowNumber: number;
  itemNumber: string;
  description: string;
  itemType: NixExtractedItemType;
  actionType: NixExtractedItemAction;
  material: string | null;
  materialGrade: string | null;
  diameter: number | null;
  diameterUnit: "mm" | "inch";
  secondaryDiameter: number | null;
  length: number | null;
  wallThickness: number | null;
  schedule: string | null;
  angle: number | null;
  flangeConfig: "none" | "one_end" | "both_ends" | "puddle" | "blind" | null;
  pressureClass: string | null;
  sdr: string | null;
  productType: NixProductType;
  quantity: number;
  unit: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason: string | null;
  sheetName?: string;
  assemblyContext?: {
    section?: string;
    group?: string;
    parent?: string;
    size?: string;
  };
  drawingReference?: string;
  itemCode?: string;
  assemblyType?: "tank" | "chute" | "hopper" | "underpan" | "custom";
  overallLengthMm?: number;
  overallWidthMm?: number;
  overallHeightMm?: number;
  totalSteelWeightKg?: number;
  liningType?: "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake";
  liningThicknessMm?: number;
  liningAreaM2?: number;
  coatingSystem?: string;
  coatingAreaM2?: number;
  surfacePrepStandard?: string;
  weldSizeMm?: number;
  plateBom?: NixExtractedPlateBomRow[];
}

export interface NixSupplierBundle {
  key: string;
  label: string;
  itemCount: number;
  totalLineQuantity: number;
  units: string[];
  itemRowNumbers: number[];
}

export interface NixDuplicateOccurrence {
  sheetName?: string;
  rowNumber: number;
  quantity: number;
  unit: string;
}

export interface NixDuplicateGroup {
  description: string;
  occurrences: NixDuplicateOccurrence[];
}

export interface NixRfqPipingProfileMetadata {
  supplierBundles: NixSupplierBundle[];
  duplicates: NixDuplicateGroup[];
  drawingReferences: string[];
  itemCodes: string[];
  supplyItemCount: number;
  dismantleItemCount: number;
}

export interface NixClarificationContext {
  rowNumber?: number;
  itemNumber?: string;
  itemDescription?: string;
  itemType?: string;
  extractedMaterial?: string | null;
  extractedDiameter?: number | null;
  extractedLength?: number | null;
  extractedAngle?: number | null;
  extractedFlangeConfig?: string | null;
  extractedQuantity?: number;
  confidence?: number;
  clarificationReason?: string | null;
  isSpecificationHeader?: boolean;
  cellRef?: string;
  rawText?: string;
  parsedMaterialGrade?: string | null;
  parsedWallThickness?: string | null;
  parsedLining?: string | null;
  parsedExternalCoating?: string | null;
  parsedStandard?: string | null;
  parsedSchedule?: string | null;
  missingFields?: string[];
}

export interface NixClarificationDto {
  id: number;
  question: string;
  context: NixClarificationContext;
}

export interface NixExtractionMetadata {
  projectReference?: string | null;
  projectLocation?: string | null;
  projectName?: string | null;
  standard?: string | null;
  coating?: string | null;
  lining?: string | null;
  materialGrade?: string | null;
  wallThickness?: string | null;
  // Tender-spec PDFs surface design / operating values so the
  // wizard's Specifications step can pre-fill them. Populated by
  // PdfExtractorService.extractMetadata().
  workingPressureBar?: number | null;
  workingTemperatureC?: number | null;
  // Valve scope lifted out of Particular Specification sections.
  // Without these, customers whose tender pack puts the valve
  // clause on page 283 of a 311-page SoW end up with a blank
  // Specifications step and silently under-scope their quote.
  valveTypes?: string[] | null;
  valveStandards?: string[] | null;
  flangeStandard?: string | null;
  flangeTableDesignation?: string | null;
  ndtMethods?: string[] | null;
  hydrotestMultiplier?: number | null;
  hydrotestHoldMinutes?: number | null;
  naceCompliance?: string | null;
  sourService?: boolean | null;
  gasketType?: string | null;
  valveClauseExcerpt?: string | null;
}

export interface NixProcessResponse {
  extractionId: number;
  status: string;
  items?: NixExtractedItem[];
  pendingClarifications?: NixClarificationDto[];
  metadata?: NixExtractionMetadata;
  profileMetadata?: NixRfqPipingProfileMetadata | Record<string, unknown>;
  error?: string;
  revisionVerdict?: NixRevisionVerdict;
}

/**
 * Outcome of the supersession check the backend runs after every successful
 * Nix extraction. Frontend uses this to decide whether to silently accept the
 * upload, surface a 'newer rev replaced' toast, or open a modal asking the
 * user to confirm whether to use an older revision they just uploaded.
 */
export interface NixRevisionVerdict {
  action: "first" | "same" | "duplicate-in-session" | "newer" | "older" | "unknown";
  canonicalExtractionId?: number;
  canonicalRevision?: string | null;
  previousCanonicalExtractionId?: number;
  previousCanonicalRevision?: string | null;
  latestExtractionId?: number;
  latestRevision?: string | null;
  otherExtractionId?: number;
  otherRevision?: string | null;
}

export interface NixCorrectionPayload {
  extractionId?: number;
  itemDescription: string;
  fieldName: string;
  originalValue: string | number | null;
  correctedValue: string | number;
  userId?: number;
}

export type RegistrationDocumentType = "vat" | "registration" | "bee";

export interface ExpectedCompanyData {
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  beeLevel?: number;
}

export interface FieldVerificationResult {
  field: string;
  expected: string | number | null;
  extracted: string | number | null;
  match: boolean;
  similarity?: number;
  autoCorrectValue?: string | number;
}

export interface ExtractedRegistrationData {
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  beeLevel?: number;
  beeExpiryDate?: string;
  verificationAgency?: string;
  confidence: number;
  fieldsExtracted: string[];
}

export interface AutoCorrection {
  field: string;
  value: string | number;
}

export interface RegistrationVerificationResult {
  success: boolean;
  documentType: RegistrationDocumentType;
  extractedData: ExtractedRegistrationData;
  fieldResults: FieldVerificationResult[];
  overallConfidence: number;
  allFieldsMatch: boolean;
  autoCorrections: AutoCorrection[];
  warnings: string[];
  ocrMethod: "pdf-parse" | "tesseract" | "ai" | "none";
  processingTimeMs: number;
  mismatchReport?: string;
}

export interface RegistrationBatchResult {
  results: RegistrationVerificationResult[];
  allSuccess: boolean;
  allFieldsMatch: boolean;
  combinedAutoCorrections: AutoCorrection[];
  totalProcessingTimeMs: number;
}

export interface PdfPageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface ExtractionRegionData {
  documentCategory: RegistrationDocumentType;
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  sampleValue: string;
}

export interface RegionExtractionResult {
  text: string;
  confidence: number;
}

export type NixDocumentRole = "drawing" | "specification" | "other";

export type NixExtractionSessionStatus = "draft" | "reviewing" | "promoted" | "archived";

export interface NixExtractionSessionDto {
  id: number;
  sourceModule: string;
  sourceId: number | null;
  extractionProfile: string;
  status: NixExtractionSessionStatus;
  title: string | null;
  externalReference: string | null;
  promotedRef: string | null;
  ownerUserId: number | null;
  createdAt: string;
  updatedAt: string;
  extractions?: Array<{
    id: number;
    documentName: string;
    documentRole?: NixDocumentRole;
    status: string;
    extractedItems?: unknown[];
    extractedData?: Record<string, unknown>;
    storagePath?: string;
    createdAt: string;
  }>;
}

export interface NixUploadOptions {
  userId?: number;
  rfqId?: number;
  sourceModule?: string;
  sourceId?: number;
  extractionProfile?: string;
  /**
   * Role of this document inside a quote/RFQ pack. Drives role-specific
   * extraction prompts and (per #253 task B) the cross-document linker's
   * drawings-first → specs-with-context ordering.
   */
  documentRole?: NixDocumentRole;
  /**
   * NixExtractionSession id. When supplied, sibling extractions in the
   * same session are passed to the role-aware system prompt as Gemini
   * context — this is the cross-document linker's primary lookup path.
   */
  sessionId?: number;
  productTypes?: string[];
  /**
   * Archive-only mode. When true, the backend mirrors the file to S3
   * via Nix's persistToObjectStorage path but skips the extractor + the
   * profile handler. Used to persist supporting documents (the .eml
   * itself, tender-spec PDFs that don't yet have an extraction profile,
   * images, etc.) immediately on upload instead of waiting for RFQ
   * submission.
   */
  skipExtraction?: boolean;
}

export const nixApi = {
  uploadAndProcess: async (
    file: File,
    userIdOrOptions?: number | NixUploadOptions,
    rfqId?: number,
    productTypes?: string[],
  ): Promise<NixProcessResponse> => {
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file object provided to Nix upload");
    }

    if (file.size === 0) {
      throw new Error("Cannot upload empty file to Nix");
    }

    const opts: NixUploadOptions = isObject(userIdOrOptions)
      ? (userIdOrOptions as NixUploadOptions)
      : {
          userId: userIdOrOptions,
          rfqId,
          productTypes,
        };

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application (like Excel). Please close it and try again.`,
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append("file", blob, file.name);
    if (opts.userId) formData.append("userId", opts.userId.toString());
    if (opts.rfqId) formData.append("rfqId", opts.rfqId.toString());
    if (opts.sourceModule) formData.append("sourceModule", opts.sourceModule);
    if (opts.sourceId) formData.append("sourceId", opts.sourceId.toString());
    if (opts.extractionProfile) formData.append("extractionProfile", opts.extractionProfile);
    if (opts.documentRole) formData.append("documentRole", opts.documentRole);
    if (opts.sessionId) formData.append("sessionId", opts.sessionId.toString());
    if (opts.productTypes && opts.productTypes.length > 0) {
      formData.append("productTypes", JSON.stringify(opts.productTypes));
    }
    if (opts.skipExtraction) formData.append("skipExtraction", "true");

    const uploadUrl = "/api/nix/upload";
    log.debug("[Nix] Uploading via API route:", uploadUrl, "File:", file.name, "Size:", file.size);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process document: ${errorText}`);
    }

    return response.json();
  },

  extractionDocumentUrl: async (
    extractionId: number,
  ): Promise<{ url: string | null; expiresInSeconds: number }> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/document-url`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...resolveNixAuthHeaders(),
      },
    });
    if (!response.ok) await failNixResponse(response, "fetch document URL");
    return response.json();
  },

  patchExtractionItem: async (
    extractionId: number,
    rowKey: { itemNumber?: string; index?: number },
    field: string,
    value: string | number | boolean | null,
  ): Promise<{ id: number; status: string }> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/items`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...resolveNixAuthHeaders(),
      },
      body: JSON.stringify({ ...rowKey, field, value }),
    });
    if (!response.ok) await failNixResponse(response, "update item");
    return response.json();
  },

  retryExtraction: async (extractionId: number): Promise<{ id: number; status: string }> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/retry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...resolveNixAuthHeaders(),
      },
    });
    if (!response.ok) await failNixResponse(response, "retry extraction");
    return response.json();
  },

  extraction: async (extractionId: number): Promise<NixProcessResponse> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get extraction: ${errorText}`);
    }

    return response.json();
  },

  pendingClarifications: async (extractionId: number): Promise<NixClarificationDto[]> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/clarifications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get clarifications: ${errorText}`);
    }

    return response.json();
  },

  submitClarification: async (
    clarificationId: number,
    responseText: string,
    allowLearning: boolean = true,
  ): Promise<{ success: boolean; remainingClarifications: number }> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: "text",
        responseText,
        allowLearning,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit clarification: ${errorText}`);
    }

    return response.json();
  },

  skipClarification: async (clarificationId: number): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: "text",
        responseText: "[SKIPPED]",
        allowLearning: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to skip clarification: ${errorText}`);
    }

    return response.json();
  },

  submitCorrection: async (correction: NixCorrectionPayload): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${baseUrl}/nix/learning/correction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(correction),
    });

    if (!response.ok) {
      log.warn("[Nix] Failed to submit correction:", await response.text());
      return { success: false };
    }

    return response.json();
  },

  verifyRegistrationDocument: async (
    file: File,
    documentType: RegistrationDocumentType,
    expectedData: ExpectedCompanyData,
  ): Promise<RegistrationVerificationResult> => {
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file object provided");
    }

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application. Please close it and try again.`,
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append("file", blob, file.name);
    formData.append("documentType", documentType);
    formData.append("expectedData", JSON.stringify(expectedData));

    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    log.debug("[Nix] Verifying registration document:", file.name, documentType);

    const response = await fetch(`${baseUrl}/nix/verify-registration-document`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Document verification failed: ${errorText}`);
    }

    return response.json();
  },

  verifyRegistrationBatch: async (
    files: Array<{ file: File; documentType: RegistrationDocumentType }>,
    expectedData: ExpectedCompanyData,
  ): Promise<RegistrationBatchResult> => {
    const formData = new FormData();
    const documentTypes: RegistrationDocumentType[] = [];

    for (const { file, documentType } of files) {
      if (!file || !(file instanceof File)) {
        throw new Error("Invalid file object provided");
      }

      let fileData: ArrayBuffer;
      try {
        fileData = await file.arrayBuffer();
      } catch {
        throw new Error(
          `Cannot read "${file.name}". The file may be open in another application. Please close it and try again.`,
        );
      }

      const blob = new Blob([fileData], { type: file.type });
      formData.append("files", blob, file.name);
      documentTypes.push(documentType);
    }

    formData.append("documentTypes", JSON.stringify(documentTypes));
    formData.append("expectedData", JSON.stringify(expectedData));

    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    log.debug("[Nix] Verifying registration batch:", files.length, "documents");

    const response = await fetch(`${baseUrl}/nix/verify-registration-batch`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch verification failed: ${errorText}`);
    }

    return response.json();
  },

  documentPages: async (file: File, scale: number = 1.5): Promise<{ pages: PdfPageImage[] }> => {
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file object provided");
    }

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application. Please close it and try again.`,
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append("file", blob, file.name);
    formData.append("scale", scale.toString());

    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await fetch(`${baseUrl}/nix/document-pages`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to convert document to images: ${errorText}`);
    }

    return response.json();
  },

  extractFromRegion: async (
    file: File,
    regionCoordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<RegionExtractionResult> => {
    if (!file || !(file instanceof File)) {
      throw new Error("Invalid file object provided");
    }

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application. Please close it and try again.`,
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append("file", blob, file.name);
    formData.append("regionCoordinates", JSON.stringify(regionCoordinates));
    formData.append("fieldName", fieldName);

    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await fetch(`${baseUrl}/nix/extract-from-region`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to extract text from region: ${errorText}`);
    }

    return response.json();
  },

  saveExtractionRegion: async (data: ExtractionRegionData): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await fetch(`${baseUrl}/nix/save-extraction-region`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      log.warn("[Nix] Failed to save extraction region:", await response.text());
      return { success: false };
    }

    return response.json();
  },

  listMineLibraryMines: async (q?: string): Promise<MineLibraryMine[]> => {
    const baseUrl = browserBaseUrl();
    const params = q && q.trim().length > 0 ? `?q=${encodeURIComponent(q.trim())}` : "";
    const response = await fetch(`${baseUrl}/nix/mine-library/mines${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
    });
    if (!response.ok) await failNixResponse(response, "list mines");
    return response.json();
  },

  listMineLibraryExtractions: async (mineId: number): Promise<MineLibraryExtractionRow[]> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/mine-library/mines/${mineId}/extractions`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
    });
    if (!response.ok) await failNixResponse(response, "list mine extractions");
    return response.json();
  },

  searchMineLibraryByDocNumber: async (
    q: string,
    options?: { mineId?: number | null; limit?: number },
  ): Promise<DocNumberSearchRow[]> => {
    const baseUrl = browserBaseUrl();
    const params = new URLSearchParams({ q });
    if (options?.mineId !== null && options?.mineId !== undefined) {
      params.set("mineId", String(options.mineId));
    }
    if (options?.limit) params.set("limit", String(options.limit));
    const response = await fetch(
      `${baseUrl}/nix/mine-library/extractions/by-doc-number?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
      },
    );
    if (!response.ok) await failNixResponse(response, "search by doc number");
    return response.json();
  },

  createMineLibraryMine: async (input: CreateMineLibraryMineInput): Promise<CreateMineResponse> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/mine-library/mines`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) await failNixResponse(response, "create mine");
    return response.json();
  },

  retagExtractionMine: async (
    extractionId: number,
    mineId: number,
  ): Promise<MineLibraryExtractionRow> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/mine-library/extractions/${extractionId}/mine`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
      body: JSON.stringify({ mineId }),
    });
    if (!response.ok) await failNixResponse(response, "retag extraction mine");
    return response.json();
  },

  clearExtractionMine: async (extractionId: number): Promise<{ ok: true }> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/nix/mine-library/extractions/${extractionId}/mine`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
    });
    if (!response.ok) await failNixResponse(response, "clear extraction mine");
    return response.json();
  },

  listMineDocumentRevisions: async (
    documentNumber: string,
    options?: { mineId?: number | null },
  ): Promise<MineLibraryExtractionRow[]> => {
    const baseUrl = browserBaseUrl();
    const params = new URLSearchParams();
    if (options?.mineId !== null && options?.mineId !== undefined) {
      params.set("mineId", String(options.mineId));
    }
    const qs = params.toString();
    const response = await fetch(
      `${baseUrl}/nix/mine-library/documents/${encodeURIComponent(documentNumber)}/revisions${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", ...resolveNixAuthHeaders() },
      },
    );
    if (!response.ok) await failNixResponse(response, "list document revisions");
    return response.json();
  },
};

export interface MineLibraryMine {
  id: number;
  mineName: string;
  operatingCompany: string;
  province: string;
  extractionCount: number;
}

export interface MineLibraryExtractionRow {
  id: number;
  documentNumber: string | null;
  documentRevision: string | null;
  documentTitle: string | null;
  sourceFilename: string | null;
  status: string;
  mineInferenceConfidence: number | null;
  mineInferenceReason: string | null;
  isLatestRevision: boolean;
  supersededByExtractionId: number | null;
  createdAt: string;
}

export interface DocNumberSearchRow {
  extractionId: number;
  documentNumber: string;
  documentRevision: string | null;
  documentTitle: string | null;
  mineId: number | null;
  mineName: string | null;
  createdAt: string;
}

export interface CreateMineLibraryMineInput {
  mineName: string;
  operatingCompany: string;
  commodityId?: number;
  province?: string;
  retagExtractionId?: number;
}

export interface CreateMineResponse {
  mine: MineLibraryMine;
  retaggedExtractionId: number | null;
}
