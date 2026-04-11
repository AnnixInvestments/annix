import { throwIfNotOk } from "@/app/lib/api/apiError";
import { createApiClient } from "@/app/lib/api/createApiClient";
import { customerTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface SubmitFeedbackDto {
  content: string;
  source: "text" | "voice";
  pageUrl?: string;
}

export interface SubmitFeedbackResponse {
  id: number;
  message: string;
}

export type FeedbackAuthContext =
  | "customer"
  | "admin"
  | "stock-control"
  | "au-rubber"
  | "supplier"
  | "cv-assistant"
  | "annix-rep"
  | "comply-sa";

const COOKIE_AUTH_CONTEXTS: FeedbackAuthContext[] = ["comply-sa"];

const AUTH_TOKEN_KEYS: Record<string, string> = {
  customer: "customerAccessToken",
  admin: "adminAccessToken",
  "stock-control": "stockControlAccessToken",
  "au-rubber": "auRubberAccessToken",
  supplier: "supplierAccessToken",
  "cv-assistant": "cvAssistantAccessToken",
  "annix-rep": "annixRepAccessToken",
};

function usesCookieAuth(authContext: FeedbackAuthContext): boolean {
  return COOKIE_AUTH_CONTEXTS.includes(authContext);
}

function resolveToken(authContext: FeedbackAuthContext): string | null {
  if (usesCookieAuth(authContext)) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const key = AUTH_TOKEN_KEYS[authContext];
  return key ? localStorage.getItem(key) || sessionStorage.getItem(key) : null;
}

const customerClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: customerTokenStore,
  refreshUrl: `${API_BASE_URL}/customer/auth/refresh`,
});

export const customerFeedbackApi = {
  submitFeedback: async (dto: SubmitFeedbackDto): Promise<SubmitFeedbackResponse> => {
    return customerClient.post<SubmitFeedbackResponse>("/customer/feedback", dto);
  },
};

export async function submitFeedbackWithAttachments(
  dto: SubmitFeedbackDto & { appContext?: string },
  files: File[],
  authContext: FeedbackAuthContext,
): Promise<SubmitFeedbackResponse> {
  const isCookieAuth = usesCookieAuth(authContext);
  const token = resolveToken(authContext);

  if (!isCookieAuth && !token) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("content", dto.content);
  formData.append("source", dto.source);
  if (dto.pageUrl) {
    formData.append("pageUrl", dto.pageUrl);
  }
  formData.append("appContext", dto.appContext || authContext);

  files.forEach((file) => {
    formData.append("files", file);
  });

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers,
    credentials: isCookieAuth ? "include" : "same-origin",
    body: formData,
  });

  await throwIfNotOk(response);

  return response.json();
}
