import { API_BASE_URL } from "@/lib/api-config";

export type FeatureFlagsResponse = Record<string, boolean>;

export type FeatureFlagCategory =
  | "customer"
  | "supplier"
  | "admin"
  | "system"
  | "registration"
  | "rfq";

export interface FeatureFlagDetail {
  flagKey: string;
  enabled: boolean;
  description: string | null;
  category: FeatureFlagCategory;
}

export interface FeatureFlagDetailResponse {
  flags: FeatureFlagDetail[];
}

class FeatureFlagsApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private adminHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("adminAccessToken") ?? sessionStorage.getItem("adminAccessToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async allFlags(): Promise<FeatureFlagsResponse> {
    const response = await fetch(`${this.baseURL}/feature-flags`);

    if (!response.ok) {
      throw new Error("Failed to fetch feature flags");
    }

    return response.json();
  }

  async allFlagsDetailed(): Promise<FeatureFlagDetailResponse> {
    const response = await fetch(`${this.baseURL}/feature-flags/detailed`, {
      headers: this.adminHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch feature flag details");
    }

    return response.json();
  }

  async updateFlag(flagKey: string, enabled: boolean): Promise<FeatureFlagDetail> {
    const response = await fetch(`${this.baseURL}/feature-flags`, {
      method: "PUT",
      headers: this.adminHeaders(),
      body: JSON.stringify({ flagKey, enabled }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update feature flag");
    }

    return response.json();
  }
}

export const featureFlagsApi = new FeatureFlagsApiClient();
