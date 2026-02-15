import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";
import { API_BASE_URL } from "@/lib/api-config";

export interface SubmitFeedbackDto {
  content: string;
  source: "text" | "voice";
  pageUrl?: string;
}

export interface SubmitFeedbackResponse {
  id: number;
  githubIssueNumber: number;
  githubIssueUrl: string;
  message: string;
}

function authHeaders(): Record<string, string> {
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
      headers: authHeaders(),
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
