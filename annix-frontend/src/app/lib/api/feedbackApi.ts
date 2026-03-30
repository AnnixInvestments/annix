import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";
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
  | "annix-rep";

const AUTH_TOKEN_KEYS: Record<FeedbackAuthContext, string> = {
  customer: "customerAccessToken",
  admin: "adminAccessToken",
  "stock-control": "stockControlAccessToken",
  "au-rubber": "auRubberAccessToken",
  supplier: "supplierAccessToken",
  "cv-assistant": "cvAssistantAccessToken",
  "annix-rep": "annixRepAccessToken",
};

function resolveToken(authContext: FeedbackAuthContext): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const key = AUTH_TOKEN_KEYS[authContext];
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function customerAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("customerAccessToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fingerprint = getStoredFingerprint();
    if (fingerprint) {
      headers["x-device-fingerprint"] = fingerprint;
    }
  }

  return headers;
}

export const customerFeedbackApi = {
  submitFeedback: async (dto: SubmitFeedbackDto): Promise<SubmitFeedbackResponse> => {
    const response = await fetch(`${API_BASE_URL}/customer/feedback`, {
      method: "POST",
      headers: customerAuthHeaders(),
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Failed to submit feedback";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

export async function submitFeedbackWithAttachments(
  dto: SubmitFeedbackDto & { appContext?: string },
  files: File[],
  authContext: FeedbackAuthContext,
): Promise<SubmitFeedbackResponse> {
  const token = resolveToken(authContext);

  if (!token) {
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

  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Failed to submit feedback";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
