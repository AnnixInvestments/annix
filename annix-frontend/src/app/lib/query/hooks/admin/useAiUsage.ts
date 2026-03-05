import { useQuery } from "@tanstack/react-query";
import { adminApiClient, type AiUsageQueryParams } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys";

export function useAiUsageLogs(params?: AiUsageQueryParams) {
  return useQuery({
    queryKey: adminKeys.aiUsage.list(params),
    queryFn: () => adminApiClient.aiUsageLogs(params),
  });
}
