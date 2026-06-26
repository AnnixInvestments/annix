import { useQuery } from "@tanstack/react-query";
import { type AiUsageQueryParams, adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys";

export function useAiUsageLogs(params?: AiUsageQueryParams) {
  return useQuery({
    queryKey: adminKeys.aiUsage.list(params),
    queryFn: () => adminApiClient.aiUsageLogs(params),
  });
}

export function useAiUsageDailySeries(days: number, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.aiUsage.dailySeries(days),
    queryFn: () => adminApiClient.aiUsageDailySeries(days),
    enabled,
  });
}

export function useAiUsageByFeature(params: { days?: number; app?: string; provider?: string }) {
  return useQuery({
    queryKey: adminKeys.aiUsage.byFeature(params),
    queryFn: () => adminApiClient.aiUsageByFeature(params),
  });
}

export function useAiUsageDailyByFeature(params: {
  days?: number;
  app?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: adminKeys.aiUsage.dailyByFeature(params),
    queryFn: () => adminApiClient.aiUsageDailyByFeature(params),
  });
}

export function useAiUsageDailyByApp(params: { days?: number; provider?: string }) {
  return useQuery({
    queryKey: adminKeys.aiUsage.dailyByApp(params),
    queryFn: () => adminApiClient.aiUsageDailyByApp(params),
  });
}
