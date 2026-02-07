"use client";

import { useFeatureFlags } from "./useFeatureFlags";

export function useRemoteAccessEnabled() {
  const { isEnabled, isLoading, error, refresh } = useFeatureFlags();

  return {
    isEnabled: isEnabled("REMOTE_ACCESS"),
    isLoading,
    error,
    refresh,
  };
}
