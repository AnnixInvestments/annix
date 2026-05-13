import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface ExtractionStats {
  category: string;
  operation: string;
  averageMs: number | null;
  sampleSize: number;
}

export type AggregatedUsageGroupBy = "category" | "operation" | "day";

export interface AggregatedUsageRow {
  category: string;
  operation: string;
  day: string | null;
  runs: number;
  failures: number;
  avgDurationMs: number;
  p95DurationMs: number;
  totalDurationMs: number;
  totalPayloadBytes: number;
  latestRunAt: string | null;
}

export interface ExtractionUsageQuery {
  from?: string;
  to?: string;
  groupBy?: AggregatedUsageGroupBy;
  category?: string;
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

  async extractionUsage(query: ExtractionUsageQuery = {}): Promise<AggregatedUsageRow[]> {
    const params = new URLSearchParams();
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.groupBy) params.set("groupBy", query.groupBy);
    if (query.category) params.set("category", query.category);
    const qs = params.toString();
    return apiClient.get<AggregatedUsageRow[]>(`/metrics/extraction-usage${qs ? `?${qs}` : ""}`);
  }
}

export const metricsApi = new MetricsApiClient();
