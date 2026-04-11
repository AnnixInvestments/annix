"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [state, setState] = useState<AsyncState<StockManagementLicenseSnapshot>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));
    client
      .licenseByCompany(companyId)
      .then((data) => {
        if (!cancelled) {
          setState({ data, isLoading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, companyId]);

  return state;
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
