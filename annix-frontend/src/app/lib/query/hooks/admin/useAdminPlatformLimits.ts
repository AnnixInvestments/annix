import { useQuery } from "@tanstack/react-query";
import { adminApiClient, type PlatformLimitsResponse } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";
import { usePollingInterval } from "./usePollingJobs";

const TWO_MINUTES = 120_000;

export function useAdminPlatformLimits() {
  const refetchInterval = usePollingInterval("admin:platform-limits", TWO_MINUTES);
  return useQuery<PlatformLimitsResponse>({
    queryKey: adminKeys.platformLimits.all,
    queryFn: () => adminApiClient.platformLimits(),
    staleTime: 30 * 1000,
    // eslint-disable-next-line no-restricted-syntax -- value sourced from usePollingInterval() above
    refetchInterval,
  });
}
