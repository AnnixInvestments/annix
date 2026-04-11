"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type {
  StockManagementFeatureKey,
  StockManagementLicenseSnapshot,
  StockManagementTier,
} from "../types/license";

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useApiClient(): StockManagementApiClient {
  const config = useStockManagementConfig();
  return useMemo(
    () =>
      new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      }),
    [config.apiBaseUrl, config.authHeaders],
  );
}

export function useCompanyLicense(companyId: number): AsyncState<StockManagementLicenseSnapshot> {
  const client = useApiClient();
  const [data, setData] = useState<StockManagementLicenseSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await client.licenseByCompany(companyId);
      setData(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [client, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export interface LicenseMutations {
  setTier: (
    companyId: number,
    tier: StockManagementTier,
    notes?: string,
  ) => Promise<StockManagementLicenseSnapshot>;
  setFeatureOverride: (
    companyId: number,
    feature: StockManagementFeatureKey,
    enabled: boolean | null,
  ) => Promise<StockManagementLicenseSnapshot>;
  setActive: (companyId: number, active: boolean) => Promise<StockManagementLicenseSnapshot>;
  isPending: boolean;
  error: Error | null;
}

export function useLicenseMutations(): LicenseMutations {
  const client = useApiClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsPending(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  };

  return {
    setTier: (companyId, tier, notes) => wrap(() => client.setTier(companyId, tier, notes)),
    setFeatureOverride: (companyId, feature, enabled) =>
      wrap(() => client.setFeatureOverride(companyId, feature, enabled)),
    setActive: (companyId, active) => wrap(() => client.setActive(companyId, active)),
    isPending,
    error,
  };
}
