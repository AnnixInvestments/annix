import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export type FeatureFlagsResponse = Record<string, boolean>;

export type FeatureFlagCategory =
  | "customer"
  | "supplier"
  | "admin"
  | "system"
  | "registration"
  | "rfq"
  | "addons";

export interface FeatureFlagDetail {
  flagKey: string;
  enabled: boolean;
  description: string | null;
  category: FeatureFlagCategory;
}

export interface FeatureFlagDetailResponse {
  flags: FeatureFlagDetail[];
}

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class FeatureFlagsApiClient {
  async allFlags(): Promise<FeatureFlagsResponse> {
    return apiClient.get<FeatureFlagsResponse>("/feature-flags");
  }

  async allFlagsDetailed(): Promise<FeatureFlagDetailResponse> {
    return apiClient.get<FeatureFlagDetailResponse>("/feature-flags/detailed");
  }

  async updateFlag(flagKey: string, enabled: boolean): Promise<FeatureFlagDetail> {
    return apiClient.put<FeatureFlagDetail>("/feature-flags", { flagKey, enabled });
  }
}

export const featureFlagsApi = new FeatureFlagsApiClient();
