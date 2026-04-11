"use client";

import { useEffect, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

interface FifoValuationState {
  totalValueR: number | null;
  legacyValueR: number | null;
  activeBatchCount: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFifoCompanyValuation(): FifoValuationState {
  const config = useStockManagementConfig();
  const [client] = useState(
    () =>
      new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      }),
  );
  const [data, setData] = useState<{
    totalValueR: number;
    legacyValueR: number;
    activeBatchCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.fifoCompanyValuation();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // biome-ignore lint/correctness/useExhaustiveDependencies: refetch is stable
  }, [client]);

  return {
    totalValueR: data?.totalValueR ?? null,
    legacyValueR: data?.legacyValueR ?? null,
    activeBatchCount: data?.activeBatchCount ?? null,
    isLoading,
    error,
    refetch,
  };
}
