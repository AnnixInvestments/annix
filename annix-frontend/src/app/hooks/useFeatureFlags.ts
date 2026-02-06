'use client';

import { useState, useEffect, useCallback } from 'react';
import { featureFlagsApi, FeatureFlagsResponse } from '@/app/lib/api/featureFlagsApi';

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlagsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await featureFlagsApi.allFlags();
      setFlags(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feature flags');
      setFlags(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

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
    isLoading,
    error,
    refresh: fetchFlags,
  };
}
