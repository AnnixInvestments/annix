"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsApi, type NeonConsumption } from "@/app/lib/api/metricsApi";
import { adminKeys } from "@/app/lib/query/keys";

export function useNeonConsumption() {
  return useQuery<NeonConsumption>({
    queryKey: adminKeys.metrics.neonConsumption(),
    queryFn: () => metricsApi.neonConsumption(),
    // eslint-disable-next-line no-restricted-syntax -- Neon API rate limit + monthly granularity make 5min refresh ample
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}
