"use client";

import { useCallback, useMemo } from "react";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { isTestEnvironment } from "@/app/lib/config/environment";

interface UseFeatureGateResult {
  isFeatureEnabled: (flagKey: string) => boolean;
  isTestEnv: boolean;
  flags: Record<string, boolean> | null;
  isLoading: boolean;
}

export function useFeatureGate(): UseFeatureGateResult {
  const { flags, isLoading } = useFeatureFlags();
  const isTestEnv = useMemo(() => isTestEnvironment(), []);

  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      if (!isTestEnv) {
        return true;
      }

      if (!flags) {
        return false;
      }

      return flags[flagKey] === true;
    },
    [isTestEnv, flags],
  );

  return {
    isFeatureEnabled,
    isTestEnv,
    flags,
    isLoading,
  };
}
