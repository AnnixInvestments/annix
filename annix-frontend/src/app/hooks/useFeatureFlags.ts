"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { type FeatureFlagsResponse, featureFlagsApi } from "@/app/lib/api/featureFlagsApi";
import { featureFlagKeys } from "@/app/lib/query/keys";

export function useFeatureFlags() {
  const query = useQuery<FeatureFlagsResponse>({
    queryKey: featureFlagKeys.public(),
    queryFn: () => featureFlagsApi.allFlags(),
    staleTime: 5 * 60 * 1000,
  });

  const rawData = query.data;
  const flags = rawData ?? null;

  const isEnabled = useCallback(
    (flagKey: string): boolean => {
      if (!flags) return false;
      return flags[flagKey] === true;
    },
    [flags],
  );

  return {
    flags,
    isEnabled,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: () => query.refetch(),
  };
}
