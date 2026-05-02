import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface ExtractionStats {
  category: string;
  operation: string;
  averageMs: number | null;
  sampleSize: number;
}

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class MetricsApiClient {
  async extractionStats(category: string, operation = ""): Promise<ExtractionStats> {
    const params = new URLSearchParams({ category });
    if (operation) params.set("operation", operation);
    return apiClient.get<ExtractionStats>(`/metrics/extraction-stats?${params.toString()}`);
  }
}

export const metricsApi = new MetricsApiClient();
