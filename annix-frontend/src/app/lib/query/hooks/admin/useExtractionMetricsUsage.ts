"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type AggregatedUsageRow,
  type ExtractionUsageQuery,
  metricsApi,
} from "@/app/lib/api/metricsApi";
import { adminKeys } from "@/app/lib/query/keys";

export function useExtractionMetricsUsage(query: ExtractionUsageQuery = {}) {
  const { from, to, groupBy, category } = query;
  return useQuery<AggregatedUsageRow[]>({
    queryKey: adminKeys.metrics.extractionUsage({ from, to, groupBy, category }),
    queryFn: () => metricsApi.extractionUsage({ from, to, groupBy, category }),
    staleTime: 60 * 1000,
  });
}
