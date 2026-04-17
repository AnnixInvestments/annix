import { browserBaseUrl } from "@/lib/api-config";
import { createMutationHook, createQueryHook } from "../../factories";
import { nixKeys } from "../../keys/nixKeys";
import { retryableFetch } from "../../retry";

type PortalContext = "admin" | "customer" | "supplier" | "annix-rep" | "general";

const TOKEN_KEY_MAP: Record<PortalContext, string> = {
  admin: "adminAccessToken",
  customer: "customerAccessToken",
  supplier: "supplierAccessToken",
  "annix-rep": "annixRepAccessToken",
  general: "adminAccessToken",
};

const TOKEN_FALLBACK_ORDER: string[] = [
  "customerAccessToken",
  "supplierAccessToken",
  "adminAccessToken",
  "annixRepAccessToken",
  "authToken",
  "token",
];

const nixAuthHeaders = (portalContext?: PortalContext): Record<string, string> => {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return {};

  let token: string | null = null;

  if (portalContext && portalContext !== "general") {
    const preferredKey = TOKEN_KEY_MAP[portalContext];
    token = localStorage.getItem(preferredKey);
  }

  if (!token) {
    for (const key of TOKEN_FALLBACK_ORDER) {
      token = localStorage.getItem(key);
      if (token) break;
    }
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
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
    method?: "GET" | "POST";
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
