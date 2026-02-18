import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { nixKeys } from "../../keys/nixKeys";
import { retryableFetch } from "../../retry";

const nixAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("adminAccessToken") ||
    localStorage.getItem("customerAccessToken") ||
    localStorage.getItem("supplierAccessToken") ||
    localStorage.getItem("annixRepAccessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token");
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

async function fetchSession(sessionId: number): Promise<ChatSession> {
  const response = await retryableFetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}`, {
    headers: nixAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }

  return response.json();
}

async function fetchHistory(
  sessionId: number,
): Promise<{ sessionId: number; messages: ChatMessage[] }> {
  const response = await retryableFetch(
    `${browserBaseUrl()}/nix/chat/session/${sessionId}/history`,
    {
      headers: nixAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.statusText}`);
  }

  return response.json();
}

export function useNixSession(sessionId: number | null) {
  return useQuery<ChatSession>({
    queryKey: nixKeys.sessions.detail(sessionId ?? 0),
    queryFn: () => fetchSession(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
  });
}

export function useNixHistory(sessionId: number | null) {
  return useQuery<{ sessionId: number; messages: ChatMessage[] }>({
    queryKey: nixKeys.sessions.history(sessionId ?? 0),
    queryFn: () => fetchHistory(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
  });
}

export function useCreateNixSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rfqId?: number): Promise<{ sessionId: number }> => {
      const response = await retryableFetch(`${browserBaseUrl()}/nix/chat/session`, {
        method: "POST",
        headers: {
          ...nixAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rfqId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.all });
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.detail(data.sessionId) });
    },
  });
}

export function useSendNixMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
      context,
    }: {
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
    }): Promise<{
      sessionId: number;
      messageId: number;
      content: string;
      metadata?: unknown;
    }> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/message`,
        {
          method: "POST",
          headers: {
            ...nixAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, context }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorMessage = body?.error || `Failed to send message: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.history(variables.sessionId) });
    },
  });
}

export function useUpdateNixPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      preferences,
    }: {
      sessionId: number;
      preferences: Partial<ChatSession["userPreferences"]>;
    }): Promise<{ success: boolean }> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/preferences`,
        {
          method: "POST",
          headers: {
            ...nixAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preferences),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.detail(variables.sessionId) });
    },
  });
}

export function useRecordNixCorrection() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      correction,
    }: {
      sessionId: number;
      correction: {
        extractedValue: string;
        correctedValue: string;
        fieldType: string;
      };
    }): Promise<{ success: boolean }> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/correction`,
        {
          method: "POST",
          headers: {
            ...nixAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(correction),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to record correction: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

export function useEndNixSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number): Promise<{ success: boolean }> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/end`,
        {
          method: "POST",
          headers: nixAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: nixKeys.sessions.history(sessionId) });
    },
  });
}

export function useParseNixItems() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
      context,
    }: {
      sessionId: number;
      message: string;
      context?: {
        currentItems?: unknown[];
        recentMessages?: string[];
      };
    }): Promise<ParseItemsResponse> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/parse-items`,
        {
          method: "POST",
          headers: {
            ...nixAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, context }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorMessage = body?.error || `Failed to parse items: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return response.json();
    },
  });
}

export function useCreateNixItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      items,
      options,
    }: {
      sessionId: number;
      items: ParsedItem[];
      options?: {
        confirmations?: ItemConfirmation[];
        rfqId?: number;
        rfqTitle?: string;
      };
    }): Promise<CreateItemsResponse> => {
      const response = await retryableFetch(
        `${browserBaseUrl()}/nix/chat/session/${sessionId}/create-items`,
        {
          method: "POST",
          headers: {
            ...nixAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items,
            confirmations: options?.confirmations,
            rfqId: options?.rfqId,
            rfqTitle: options?.rfqTitle,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorMessage = body?.error || `Failed to create items: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq"] });
    },
  });
}

export function useValidateNixItem() {
  return useMutation({
    mutationFn: async ({
      item,
      context,
    }: {
      item: unknown;
      context?: { allItems?: unknown[]; itemIndex?: number };
    }): Promise<{
      valid: boolean;
      issues: ValidationIssue[];
    }> => {
      const response = await retryableFetch(`${browserBaseUrl()}/nix/chat/validate/item`, {
        method: "POST",
        headers: {
          ...nixAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ item, context }),
      });

      if (!response.ok) {
        throw new Error(`Failed to validate item: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

export function useValidateNixRfq() {
  return useMutation({
    mutationFn: async (
      items: unknown[],
    ): Promise<{
      valid: boolean;
      issues: ValidationIssue[];
      summary: {
        errors: number;
        warnings: number;
        info: number;
      };
    }> => {
      const response = await retryableFetch(`${browserBaseUrl()}/nix/chat/validate/rfq`, {
        method: "POST",
        headers: {
          ...nixAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error(`Failed to validate RFQ: ${response.statusText}`);
      }

      return response.json();
    },
  });
}
