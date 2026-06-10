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
