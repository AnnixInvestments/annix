"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { type FeatureFlagsResponse, featureFlagsApi } from "@/app/lib/api/featureFlagsApi";
import { nowMillis } from "@/app/lib/datetime";
import { featureFlagKeys } from "@/app/lib/query/keys";

const STORAGE_KEY = "annixFeatureFlags";
const STALE_MS = 5 * 60 * 1000;

interface CachedFlags {
  flags: FeatureFlagsResponse;
  cachedAt: number;
}

function loadCachedFlags(): CachedFlags | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedFlags;
    const cachedAt = parsed.cachedAt;
    if (!cachedAt || nowMillis() - cachedAt > STALE_MS) return null;
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useFeatureFlags() {
  const query = useQuery<FeatureFlagsResponse>({
    queryKey: featureFlagKeys.public(),
    queryFn: async () => {
      const flags = await featureFlagsApi.allFlags();
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window !== "undefined") {
        const snapshot: CachedFlags = { flags, cachedAt: nowMillis() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      }
      return flags;
    },
    initialData: () => {
      const cached = loadCachedFlags();
      return cached ? cached.flags : undefined;
    },
    initialDataUpdatedAt: () => {
      const cached = loadCachedFlags();
      return cached ? cached.cachedAt : undefined;
    },
    staleTime: STALE_MS,
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
