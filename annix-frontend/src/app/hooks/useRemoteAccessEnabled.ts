'use client';

import { useState, useEffect, useCallback } from 'react';
import { remoteAccessApi } from '@/app/lib/api/remoteAccessApi';

export function useRemoteAccessEnabled() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkEnabled = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const enabled = await remoteAccessApi.isFeatureEnabled();
      setIsEnabled(enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check feature status');
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkEnabled();
  }, [checkEnabled]);

  return {
    isEnabled,
    isLoading,
    error,
    refresh: checkEnabled,
  };
}
