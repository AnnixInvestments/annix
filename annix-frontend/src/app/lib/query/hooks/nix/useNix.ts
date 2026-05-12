import { isString } from "es-toolkit/compat";
import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { anyPortalAuthHeaders } from "@/app/lib/api/portalTokenStores";
import { fromISO } from "@/app/lib/datetime";
import { browserBaseUrl } from "@/lib/api-config";
import { createMutationHook, createQueryHook } from "../../factories";
import { nixKeys } from "../../keys/nixKeys";
import { retryableFetch } from "../../retry";

type PortalContext = "admin" | "customer" | "supplier" | "annix-rep" | "general";

/**
 * Resolves Authorization headers for Nix calls by delegating to the
 * canonical PortalTokenStore registry. Whichever portal token store is
 * currently authenticated (Stock Control, Customer, Supplier, etc.) wins.
 * The portalContext argument is ignored today — kept for call-site
 * compatibility while the lookup is portal-agnostic. (The helper at
 * `lib/api/portalTokenStores.ts` is the single source of truth.)
 */
const nixAuthHeaders = (_portalContext?: PortalContext): Record<string, string> => {
  return anyPortalAuthHeaders();
};

export interface ChatSession {
  sessionId: number;
  userId: number;
  rfqId?: number;
  isActive: boolean;
  userPreferences: {
    preferredMaterials?: string[];
    preferredSchedules?: string[];
    preferredStandards?: string[];
    commonFlangeRatings?: string[];
    unitPreference?: "metric" | "imperial";
    learningEnabled?: boolean;
  };
  lastInteractionAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    intent?: string;
    itemsCreated?: number;
    validationIssues?: unknown[];
    suggestionsProvided?: string[];
    tokensUsed?: number;
    processingTimeMs?: number;
    model?: string;
  };
  createdAt: string;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
  itemIndex?: number;
}

export interface ParsedItemSpecifications {
  diameter?: number;
  secondaryDiameter?: number;
  length?: number;
  schedule?: string;
  material?: string;
  materialGrade?: string;
  angle?: number;
  flangeConfig?: string;
  flangeRating?: string;
  quantity?: number;
  description?: string;
}

export interface ParsedItem {
  action: "create_item" | "update_item" | "delete_item" | "question" | "validation" | "unknown";
  itemType?:
    | "pipe"
    | "bend"
    | "reducer"
    | "tee"
    | "flange"
    | "expansion_joint"
    | "valve"
    | "instrument"
    | "pump";
  specifications?: ParsedItemSpecifications;
  confidence: number;
  explanation: string;
  originalText?: string;
}

export interface ParseItemsResponse {
  sessionId: number;
  parsedItems: ParsedItem[];
  requiresConfirmation: boolean;
  validationIssues?: Array<{
    itemIndex: number;
    severity: "error" | "warning" | "info";
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

export interface ItemConfirmation {
  index: number;
  confirmed: boolean;
  modifiedSpecs?: ParsedItemSpecifications;
}

export interface CreateItemsResponse {
  success: boolean;
  rfqId: number;
  rfqNumber: string;
  itemsCreated: number;
  items: Array<{
    lineNumber: number;
    itemType: string;
    description: string;
    quantity: number;
    originalIndex: number;
  }>;
  failedItems?: Array<{
    index: number;
    reason: string;
  }>;
}

async function nixRequest<TResponse>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE" | "PATCH" | "PUT";
    body?: unknown;
    portalContext?: PortalContext;
    errorLabel: string;
    parseErrorBody?: boolean;
  },
): Promise<TResponse> {
  const headers: Record<string, string> = { ...nixAuthHeaders(options.portalContext) };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const rawMethod = options.method;

  const response = await retryableFetch(`${browserBaseUrl()}${path}`, {
    method: rawMethod || "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Fire the global session-expired event so the SessionExpiredModal
      // shows a branded "please sign in again" prompt instead of the page
      // rendering "Could not load session — it may have been deleted".
      sessionExpiredEvent.emit();
      throw new Error("Session expired — please sign in again.");
    }
    if (options.parseErrorBody) {
      const body = await response.json().catch(() => null);
      const rawError = body?.error;
      const errorMessage = rawError || `${options.errorLabel}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    throw new Error(`${options.errorLabel}: ${response.statusText}`);
  }

  return response.json();
}

export const useNixSession = createQueryHook(
  (sessionId: number | null) => nixKeys.sessions.detail(sessionId ?? 0),
  (sessionId: number | null) =>
    nixRequest<ChatSession>(`/nix/chat/session/${sessionId}`, {
      errorLabel: "Failed to fetch session",
    }),
  { enabled: (sessionId: number | null) => sessionId !== null && sessionId > 0 },
);

export const useNixHistory = createQueryHook(
  (sessionId: number | null) => nixKeys.sessions.history(sessionId ?? 0),
  (sessionId: number | null) =>
    nixRequest<{ sessionId: number; messages: ChatMessage[] }>(
      `/nix/chat/session/${sessionId}/history`,
      { errorLabel: "Failed to fetch chat history" },
    ),
  { enabled: (sessionId: number | null) => sessionId !== null && sessionId > 0 },
);

export const useCreateNixSession = createMutationHook<
  { sessionId: number },
  { rfqId?: number; portalContext?: PortalContext }
>(
  ({ rfqId, portalContext }) =>
    nixRequest<{ sessionId: number }>("/nix/chat/session", {
      method: "POST",
      body: { rfqId },
      portalContext,
      errorLabel: "Failed to create chat session",
    }),
  (data) => [nixKeys.sessions.all, nixKeys.sessions.detail(data.sessionId)],
);

export const useSendNixMessage = createMutationHook<
  { sessionId: number; messageId: number; content: string; metadata?: unknown },
  {
    sessionId: number;
    message: string;
    context?: {
      currentRfqItems?: unknown[];
      lastValidationIssues?: unknown[];
      pageContext?: {
        currentPage: string;
        rfqType?: string;
        portalContext: "customer" | "supplier" | "admin" | "general";
      };
    };
    portalContext?: PortalContext;
  }
>(
  ({ sessionId, message, context, portalContext }) => {
    const effectivePortalContext =
      portalContext || (context?.pageContext?.portalContext as PortalContext) || undefined;
    return nixRequest(`/nix/chat/session/${sessionId}/message`, {
      method: "POST",
      body: { message, context },
      portalContext: effectivePortalContext,
      errorLabel: "Failed to send message",
      parseErrorBody: true,
    });
  },
  (_data, variables) => [nixKeys.sessions.history(variables.sessionId)],
);

export const useUpdateNixPreferences = createMutationHook<
  { success: boolean },
  { sessionId: number; preferences: Partial<ChatSession["userPreferences"]> }
>(
  ({ sessionId, preferences }) =>
    nixRequest<{ success: boolean }>(`/nix/chat/session/${sessionId}/preferences`, {
      method: "POST",
      body: preferences,
      errorLabel: "Failed to update preferences",
    }),
  (_data, variables) => [nixKeys.sessions.detail(variables.sessionId)],
);

export const useRecordNixCorrection = createMutationHook<
  { success: boolean },
  {
    sessionId: number;
    correction: { extractedValue: string; correctedValue: string; fieldType: string };
  }
>(({ sessionId, correction }) =>
  nixRequest<{ success: boolean }>(`/nix/chat/session/${sessionId}/correction`, {
    method: "POST",
    body: correction,
    errorLabel: "Failed to record correction",
  }),
);

export const useEndNixSession = createMutationHook<{ success: boolean }, number>(
  (sessionId) =>
    nixRequest<{ success: boolean }>(`/nix/chat/session/${sessionId}/end`, {
      method: "POST",
      errorLabel: "Failed to end session",
    }),
  (_data, sessionId) => [nixKeys.sessions.detail(sessionId), nixKeys.sessions.history(sessionId)],
);

export const useParseNixItems = createMutationHook<
  ParseItemsResponse,
  {
    sessionId: number;
    message: string;
    context?: { currentItems?: unknown[]; recentMessages?: string[] };
  }
>(({ sessionId, message, context }) =>
  nixRequest<ParseItemsResponse>(`/nix/chat/session/${sessionId}/parse-items`, {
    method: "POST",
    body: { message, context },
    errorLabel: "Failed to parse items",
    parseErrorBody: true,
  }),
);

export const useCreateNixItems = createMutationHook<
  CreateItemsResponse,
  {
    sessionId: number;
    items: ParsedItem[];
    options?: { confirmations?: ItemConfirmation[]; rfqId?: number; rfqTitle?: string };
  }
>(
  ({ sessionId, items, options }) =>
    nixRequest<CreateItemsResponse>(`/nix/chat/session/${sessionId}/create-items`, {
      method: "POST",
      body: {
        items,
        confirmations: options?.confirmations,
        rfqId: options?.rfqId,
        rfqTitle: options?.rfqTitle,
      },
      errorLabel: "Failed to create items",
      parseErrorBody: true,
    }),
  [["rfq"]],
);

export const useValidateNixItem = createMutationHook<
  { valid: boolean; issues: ValidationIssue[] },
  { item: unknown; context?: { allItems?: unknown[]; itemIndex?: number } }
>(({ item, context }) =>
  nixRequest<{ valid: boolean; issues: ValidationIssue[] }>("/nix/chat/validate/item", {
    method: "POST",
    body: { item, context },
    errorLabel: "Failed to validate item",
  }),
);

export interface NixExtractionDocumentUrlResponse {
  url: string | null;
  expiresInSeconds: number;
}

/**
 * Fetches a short-lived presigned URL for the original source document of a
 * Nix extraction. Used by the draft review UI's "View original" links so
 * the user can audit Nix's reading against the actual drawing or spec.
 *
 * Returns null when the extraction has no S3-persisted source (legacy rows
 * created before #253 task E).
 */
export const useNixExtractionDocumentUrl = createQueryHook(
  (extractionId: number | null) => nixKeys.extractions.documentUrl(extractionId ?? 0),
  (extractionId: number | null) =>
    nixRequest<NixExtractionDocumentUrlResponse>(`/nix/extraction/${extractionId}/document-url`, {
      errorLabel: "Failed to fetch document URL",
    }),
  {
    enabled: (extractionId: number | null) => extractionId !== null && extractionId > 0,
    // Presigned URL is short-lived (10 minutes) — refetch on focus and after
    // 5 minutes so a stale tab can still open the document.
    staleTime: 5 * 60 * 1000,
  },
);

/**
 * Reads a single product data sheet (PDF / image) and asks Gemini to extract
 * a quoter-friendly `brand` + `description` formatted for the
 * QuoteSpecsEditor supplier-row layout. Used by the 'Upload data sheet'
 * affordance on each custom supplier row to auto-fill the description.
 *
 * Multipart upload, so we hand-roll the request rather than going through
 * `nixRequest` (which assumes JSON bodies).
 *
 * Superseded by `uploadProductDataSheet` below, which also registers the
 * sheet in the shared library — kept for callers that only need extraction.
 */
export async function extractProductSpecFromDataSheet(
  file: File,
  kind: "coating" | "lining",
  portalContext?: PortalContext,
): Promise<{ brand: string | null; description: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const headers: Record<string, string> = { ...nixAuthHeaders(portalContext) };
  const response = await retryableFetch(`${browserBaseUrl()}/nix/extract-product-spec`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 401) {
      sessionExpiredEvent.emit();
      throw new Error("Session expired — please sign in again.");
    }
    const body = await response.json().catch(() => null);
    const bodyMessage = body ? body.message : null;
    const bodyError = body ? body.error : null;
    const serverMessage = isString(bodyMessage)
      ? bodyMessage
      : isString(bodyError)
        ? bodyError
        : null;
    const detail = serverMessage ? ` — ${serverMessage}` : "";
    console.warn(
      `[extractProductSpecFromDataSheet] ${response.status} ${response.statusText}${detail}`,
      body,
    );
    throw new Error(`Failed to extract product spec: ${response.statusText}${detail}`);
  }
  return response.json();
}

/**
 * Uploads a product data sheet to the shared org-wide library AND returns the
 * Gemini-extracted brand + description for auto-filling the supplier row.
 * Mirrors the mine-spec versioning pattern: if a quote in any future app
 * uploads the same (manufacturer, product) again, this endpoint reuses the
 * existing row (same printed revision) or supersedes it (higher revision).
 *
 * Outcomes:
 *  - 'new'        — first time this manufacturer + product reached the library.
 *  - 'reused'     — incoming revision matched the current latest; no new
 *                   S3 object was written.
 *  - 'superseded' — incoming revision was newer; the old current row is now
 *                   archived (is_latest = false) and this is the new latest.
 */
export interface UploadProductDataSheetResult {
  dataSheetId: number;
  manufacturer: string;
  productName: string;
  kind: "coating" | "lining";
  version: number;
  publishedRevision: string | null;
  publishedDate: string | null;
  brand: string | null;
  description: string | null;
  outcome: "new" | "reused" | "superseded";
  supersededFromRevision: string | null;
}

export async function uploadProductDataSheet(
  file: File,
  kind: "coating" | "lining",
  portalContext?: PortalContext,
): Promise<UploadProductDataSheetResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const headers: Record<string, string> = { ...nixAuthHeaders(portalContext) };
  const response = await retryableFetch(`${browserBaseUrl()}/nix/product-data-sheets/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 401) {
      sessionExpiredEvent.emit();
      throw new Error("Session expired — please sign in again.");
    }
    const body = await response.json().catch(() => null);
    const bodyMessage = body ? body.message : null;
    const bodyError = body ? body.error : null;
    const serverMessage = isString(bodyMessage)
      ? bodyMessage
      : isString(bodyError)
        ? bodyError
        : null;
    const detail = serverMessage ? ` — ${serverMessage}` : "";
    console.warn(
      `[uploadProductDataSheet] ${response.status} ${response.statusText}${detail}`,
      body,
    );
    throw new Error(`Failed to upload data sheet: ${response.statusText}${detail}`);
  }
  return response.json();
}

/* ------------------------------------------------------------------
 * Nix extraction sessions (#253 task B)
 *
 * A session groups multiple uploads (drawings + specs) into a single
 * quote pack so the cross-document orchestrator can pass earlier
 * extractions as context when later documents arrive.
 * ------------------------------------------------------------------ */

export interface NixExtractionSummary {
  id: number;
  documentName: string;
  documentRole?: "drawing" | "specification" | "other";
  status: string;
  extractedItems?: unknown[];
  extractedData?: Record<string, unknown>;
  storagePath?: string;
  createdAt: string;
  documentNumber?: string | null;
  documentRevision?: string | null;
  mineId?: number | null;
  mineName?: string | null;
  mineCountry?: string | null;
  mineInferenceConfidence?: number | null;
  mineInferenceReason?: string | null;
  isLatestRevision?: boolean;
  supersededByExtractionId?: number | null;
}

export interface NixExtractionSessionDto {
  id: number;
  sourceModule: string;
  sourceId: number | null;
  extractionProfile: string;
  status: "draft" | "reviewing" | "promoted" | "archived";
  title: string | null;
  externalReference: string | null;
  promotedRef: string | null;
  ownerUserId: number | null;
  extractions?: NixExtractionSummary[];
  /**
   * Opaque-to-the-backend bundle storing the QuoteSpecsEditor's persisted
   * state for this session — supplier overrides, per-spec rates, and
   * data-sheet attachment metadata. Frontend owns the shape; the type below
   * mirrors what the editor writes back.
   */
  quoteEditorState?: QuoteEditorStateDto | null;
  customerCompanyId?: number | null;
  customerSnapshot?: QuoteCustomerSnapshot | null;
  customerOrderNumber?: string | null;
  deliveryNoteRef?: string | null;
  quoteNotes?: QuoteNotesDto | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Free-text notes that surface in the customer-facing PDF between item
 * sections. `perPool` keys are pool keys (poolItemsBySpec output); the
 * matching string renders at the end of that section. `generalAfterItems`
 * sits at the very bottom of the items list, before the totals.
 */
export interface QuoteNotesDto {
  perPool: Record<string, string>;
  generalAfterItems: string;
}

/**
 * Shape of the persisted QuoteSpecsEditor bundle. Mirrors the local in-
 * memory state on the promoted-quote page so a refresh restores everything
 * the quoter has done — custom supplier rows, R/m² and R/Rm rates, and
 * which library data-sheets are attached to which row.
 *
 * `attachments` only ever holds the link metadata (dataSheetId + filename);
 * the actual PDF bytes live on S3 via the product-data-sheet library and
 * are fetched on-demand via the presigned-URL endpoint.
 */
export interface QuoteEditorStateDto {
  overrides: Record<string, unknown>;
  rates: Record<string, unknown>;
  attachments: Record<string, unknown>;
}

/**
 * Customer details captured at quote-time for the PDF header. Either copied
 * from the master picker (companyId set) or freshly typed by the quoter
 * (companyId null — one-off customer that lives only on this quote).
 */
export interface QuoteCustomerSnapshot {
  name: string;
  customerCode?: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
}

export interface SaveQuoteCustomerInput {
  sessionId: number;
  companyId: number | null;
  snapshot: QuoteCustomerSnapshot | null;
}

export const useSaveQuoteCustomer = createMutationHook<
  NixExtractionSessionDto,
  SaveQuoteCustomerInput
>(
  ({ sessionId, companyId, snapshot }) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/customer`, {
      method: "POST",
      body: { companyId, snapshot },
      errorLabel: "Failed to save customer",
    }),
  (_data, vars) => [nixKeys.extractionSessions.detail(vars.sessionId)],
);

export const useSaveQuoteOrderNumber = createMutationHook<
  NixExtractionSessionDto,
  { sessionId: number; orderNumber: string | null }
>(
  ({ sessionId, orderNumber }) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/order-number`, {
      method: "POST",
      body: { orderNumber },
      errorLabel: "Failed to save order number",
    }),
  (_data, vars) => [nixKeys.extractionSessions.detail(vars.sessionId)],
);

export const useSaveQuoteDeliveryNoteRef = createMutationHook<
  NixExtractionSessionDto,
  { sessionId: number; ref: string | null }
>(
  ({ sessionId, ref }) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/delivery-note-ref`, {
      method: "POST",
      body: { ref },
      errorLabel: "Failed to save delivery note reference",
    }),
  (_data, vars) => [nixKeys.extractionSessions.detail(vars.sessionId)],
);

export const useSaveQuoteNotes = createMutationHook<
  NixExtractionSessionDto,
  { sessionId: number; quoteNotes: QuoteNotesDto | null }
>(
  ({ sessionId, quoteNotes }) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/notes`, {
      method: "POST",
      body: { quoteNotes },
      errorLabel: "Failed to save quote notes",
    }),
  (_data, vars) => [nixKeys.extractionSessions.detail(vars.sessionId)],
);

export const useSuggestQuoteOrderNumber = createMutationHook<
  { suggestion: string | null },
  { sessionId: number }
>(({ sessionId }) =>
  nixRequest<{ suggestion: string | null }>(`/nix/sessions/${sessionId}/suggest-order-number`, {
    method: "POST",
    body: {},
    errorLabel: "Failed to suggest order number",
  }),
);

export const useSaveQuoteEditorState = createMutationHook<
  NixExtractionSessionDto,
  { sessionId: number; state: QuoteEditorStateDto | null }
>(({ sessionId, state }) =>
  nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/quote-state`, {
    method: "POST",
    body: { quoteEditorState: state },
    errorLabel: "Failed to save quote editor state",
  }),
);

export const useNixExtractionSession = createQueryHook(
  (sessionId: number | null) => nixKeys.extractionSessions.detail(sessionId ?? 0),
  (sessionId: number | null) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}`, {
      errorLabel: "Failed to fetch extraction session",
    }),
  { enabled: (sessionId: number | null) => sessionId !== null && sessionId > 0 },
);

export const useNixExtractionSessions = createQueryHook(
  (filter: { sourceModule?: string; status?: string } | undefined) =>
    nixKeys.extractionSessions.list(filter?.sourceModule, filter?.status),
  (filter: { sourceModule?: string; status?: string } | undefined) => {
    const params = new URLSearchParams();
    if (filter?.sourceModule) params.set("sourceModule", filter.sourceModule);
    if (filter?.status) params.set("status", filter.status);
    const qs = params.toString();
    return nixRequest<NixExtractionSessionDto[]>(`/nix/sessions${qs ? `?${qs}` : ""}`, {
      errorLabel: "Failed to list extraction sessions",
    });
  },
  { enabled: (filter) => filter !== undefined },
);

export const useDeleteNixExtractionSession = createMutationHook<{ ok: true }, number>(
  (sessionId) =>
    nixRequest<{ ok: true }>(`/nix/sessions/${sessionId}`, {
      method: "DELETE",
      errorLabel: "Failed to delete extraction session",
    }),
  () => [nixKeys.extractionSessions.all],
);

/**
 * Computes the display quote reference for a Nix extraction session —
 * `QUO-{YYYY}-{id padded to 4 digits}` — derived deterministically from the
 * session's createdAt year and id, no DB write required. Stable across
 * reloads (same session always renders the same ref).
 */
export function quoteRefForSession(session: { id: number; createdAt: string }): string {
  const year = fromISO(session.createdAt).year;
  return `QUO-${year}-${session.id.toString().padStart(4, "0")}`;
}

export const useCreateNixExtractionSession = createMutationHook<
  NixExtractionSessionDto,
  {
    sourceModule: string;
    extractionProfile: string;
    title?: string;
    externalReference?: string;
  }
>(
  (body) =>
    nixRequest<NixExtractionSessionDto>("/nix/sessions", {
      method: "POST",
      body,
      errorLabel: "Failed to create extraction session",
    }),
  (data) => [nixKeys.extractionSessions.all, nixKeys.extractionSessions.detail(data.id)],
);

export const useSetNixExtractionSessionStatus = createMutationHook<
  NixExtractionSessionDto,
  {
    sessionId: number;
    status: "draft" | "reviewing" | "promoted" | "archived";
    promotedRef?: string;
  }
>(
  ({ sessionId, status, promotedRef }) =>
    nixRequest<NixExtractionSessionDto>(`/nix/sessions/${sessionId}/status`, {
      method: "POST",
      body: { status, promotedRef },
      errorLabel: "Failed to update session status",
    }),
  (_data, vars) => [nixKeys.extractionSessions.detail(vars.sessionId)],
);

export const useValidateNixRfq = createMutationHook<
  {
    valid: boolean;
    issues: ValidationIssue[];
    summary: { errors: number; warnings: number; info: number };
  },
  unknown[]
>((items) =>
  nixRequest("/nix/chat/validate/rfq", {
    method: "POST",
    body: { items },
    errorLabel: "Failed to validate RFQ",
  }),
);

/* ------------------------------------------------------------------
 * Nix capabilities (ref #262 Phase 2)
 *
 * The frontend NixAppProvider reads this to know which intents,
 * guide-slugs, and walkthrough-availability flags to surface in chat.
 * Backend authoritative routing reads from the same registry; this is
 * the read-only mirror frontend code consumes.
 * ------------------------------------------------------------------ */

export interface NixCapability {
  key: string;
  appCode: string;
  label: string;
  description: string;
  intents?: string[];
  guideSlug?: string;
  hasWalkthrough: boolean;
  hasExtractionProfile: boolean;
}

export interface NixApp {
  appCode: string;
  capabilityCount: number;
}

export const useNixCapabilities = createQueryHook(
  (appCode: string | undefined) => nixKeys.capabilities.list(appCode),
  (appCode: string | undefined) => {
    const query = appCode ? `?appCode=${encodeURIComponent(appCode)}` : "";
    return nixRequest<NixCapability[]>(`/nix/capabilities${query}`, {
      errorLabel: "Failed to fetch Nix capabilities",
    });
  },
  {
    staleTime: 5 * 60 * 1000,
  },
);

export const useNixApps = createQueryHook(
  () => nixKeys.capabilities.apps,
  () =>
    nixRequest<NixApp[]>("/nix/capabilities/apps", {
      errorLabel: "Failed to fetch Nix apps",
    }),
  {
    staleTime: 5 * 60 * 1000,
  },
);

/* ------------------------------------------------------------------
 * Nix walkthrough mode (ref #262 Phase 4)
 *
 * Drives the per-session walkthrough lifecycle:
 *   useStartWalkthrough → useAdvance/Back/Skip → useStopWalkthrough
 * Plus useWalkthroughState / useWalkthroughCurrentStep for read-side.
 * ------------------------------------------------------------------ */

export type WalkthroughEndReason = "completed" | "abandoned" | "stopped";

export interface WalkthroughStepView {
  step: number;
  totalSteps: number;
  title: string;
  body: string;
  isLast: boolean;
  capabilityLabel: string;
}

export interface WalkthroughState {
  capabilityKey: string;
  guideSlug: string | null;
  startedAt: string;
  currentStep: number;
  totalSteps: number;
  stepHistory: Array<{
    step: number;
    title: string;
    completedAt: string;
    action: "advanced" | "back" | "skipped" | "stuck";
  }>;
  endedAt?: string;
  endReason?: WalkthroughEndReason;
}

export const useStartWalkthrough = createMutationHook<
  WalkthroughStepView,
  { sessionId: number; capabilityKey: string }
>(
  ({ sessionId, capabilityKey }) =>
    nixRequest<WalkthroughStepView>(`/nix/walkthrough/${sessionId}/start`, {
      method: "POST",
      body: { capabilityKey },
      errorLabel: "Failed to start walkthrough",
    }),
  (_data, vars) => [
    nixKeys.walkthrough.state(vars.sessionId),
    nixKeys.walkthrough.currentStep(vars.sessionId),
  ],
);

export const useAdvanceWalkthrough = createMutationHook<
  WalkthroughStepView | null,
  { sessionId: number }
>(
  ({ sessionId }) =>
    nixRequest<WalkthroughStepView | null>(`/nix/walkthrough/${sessionId}/advance`, {
      method: "POST",
      errorLabel: "Failed to advance walkthrough",
    }),
  (_data, vars) => [
    nixKeys.walkthrough.state(vars.sessionId),
    nixKeys.walkthrough.currentStep(vars.sessionId),
  ],
);

export const useBackWalkthrough = createMutationHook<
  WalkthroughStepView | null,
  { sessionId: number }
>(
  ({ sessionId }) =>
    nixRequest<WalkthroughStepView | null>(`/nix/walkthrough/${sessionId}/back`, {
      method: "POST",
      errorLabel: "Failed to step back in walkthrough",
    }),
  (_data, vars) => [
    nixKeys.walkthrough.state(vars.sessionId),
    nixKeys.walkthrough.currentStep(vars.sessionId),
  ],
);

export const useSkipWalkthrough = createMutationHook<
  WalkthroughStepView | null,
  { sessionId: number }
>(
  ({ sessionId }) =>
    nixRequest<WalkthroughStepView | null>(`/nix/walkthrough/${sessionId}/skip`, {
      method: "POST",
      errorLabel: "Failed to skip walkthrough step",
    }),
  (_data, vars) => [
    nixKeys.walkthrough.state(vars.sessionId),
    nixKeys.walkthrough.currentStep(vars.sessionId),
  ],
);

export const useStopWalkthrough = createMutationHook<
  { ok: true },
  { sessionId: number; reason?: WalkthroughEndReason }
>(
  ({ sessionId, reason }) =>
    nixRequest<{ ok: true }>(`/nix/walkthrough/${sessionId}/stop`, {
      method: "POST",
      body: reason ? { reason } : undefined,
      errorLabel: "Failed to stop walkthrough",
    }),
  (_data, vars) => [
    nixKeys.walkthrough.state(vars.sessionId),
    nixKeys.walkthrough.currentStep(vars.sessionId),
  ],
);

export const useWalkthroughState = createQueryHook(
  (sessionId: number | null) => nixKeys.walkthrough.state(sessionId ?? 0),
  (sessionId: number | null) =>
    nixRequest<WalkthroughState | null>(`/nix/walkthrough/${sessionId}/state`, {
      method: "POST",
      errorLabel: "Failed to fetch walkthrough state",
    }),
  { enabled: (sessionId: number | null) => sessionId !== null && sessionId > 0 },
);

export const useWalkthroughCurrentStep = createQueryHook(
  (sessionId: number | null) => nixKeys.walkthrough.currentStep(sessionId ?? 0),
  (sessionId: number | null) =>
    nixRequest<WalkthroughStepView | null>(`/nix/walkthrough/${sessionId}/current-step`, {
      method: "POST",
      errorLabel: "Failed to fetch current walkthrough step",
    }),
  { enabled: (sessionId: number | null) => sessionId !== null && sessionId > 0 },
);
