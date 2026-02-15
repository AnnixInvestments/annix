"use client";

import { useCallback } from "react";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";

interface UseFeatureGateResult {
  isFeatureEnabled: (flagKey: string) => boolean;
  flags: Record<string, boolean> | null;
  isLoading: boolean;
}

export function useFeatureGate(): UseFeatureGateResult {
  const { flags, isLoading } = useFeatureFlags();

  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      if (!flags) {
        return false;
      }

      return flags[flagKey] === true;
    },
    [flags],
  );

  return {
    isFeatureEnabled,
    flags,
    isLoading,
  };
}
