"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { StockTakeDto, StockTakeStatus } from "../types/stockTake";

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

function useAsync<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useStockTakes(status?: StockTakeStatus): AsyncState<StockTakeDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listStockTakes(status) as Promise<StockTakeDto[]>, [client, status]);
}

export function useStockTake(id: number | null): AsyncState<StockTakeDto> {
  const client = useApiClient();
  return useAsync(
    () =>
      id === null
        ? Promise.resolve(null as unknown as StockTakeDto)
        : (client.stockTakeById(id) as Promise<StockTakeDto>),
    [client, id],
  );
}

export interface StockTakeMutations {
  create: (dto: { name: string; periodLabel?: string; notes?: string }) => Promise<StockTakeDto>;
  captureSnapshot: (id: number) => Promise<StockTakeDto>;
  recordCount: (
    id: number,
    productId: number,
    countedQty: number,
    countedByStaffId: number,
    options?: { varianceCategoryId?: number; varianceReason?: string; photoUrl?: string },
  ) => Promise<unknown>;
  submit: (id: number) => Promise<StockTakeDto>;
  approve: (id: number) => Promise<StockTakeDto>;
  reject: (id: number, reason: string) => Promise<StockTakeDto>;
  post: (id: number) => Promise<StockTakeDto>;
  isPending: boolean;
  error: Error | null;
}

export function useStockTakeMutations(): StockTakeMutations {
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
    create: (dto) => wrap(() => client.createStockTake(dto) as Promise<StockTakeDto>),
    captureSnapshot: (id) =>
      wrap(() => client.captureStockTakeSnapshot(id) as Promise<StockTakeDto>),
    recordCount: (id, productId, countedQty, countedByStaffId, options) => {
      const varianceCategoryIdRaw = options?.varianceCategoryId;
      const varianceReasonRaw = options?.varianceReason;
      const photoUrlRaw = options?.photoUrl;
      const varianceCategoryId = varianceCategoryIdRaw == null ? null : varianceCategoryIdRaw;
      const varianceReason = varianceReasonRaw == null ? null : varianceReasonRaw;
      const photoUrl = photoUrlRaw == null ? null : photoUrlRaw;
      return wrap(() =>
        client.recordStockTakeCount(id, {
          productId,
          countedQty,
          countedByStaffId,
          varianceCategoryId,
          varianceReason,
          photoUrl,
        }),
      );
    },
    submit: (id) => wrap(() => client.submitStockTake(id) as Promise<StockTakeDto>),
    approve: (id) => wrap(() => client.approveStockTake(id) as Promise<StockTakeDto>),
    reject: (id, reason) => wrap(() => client.rejectStockTake(id, reason) as Promise<StockTakeDto>),
    post: (id) => wrap(() => client.postStockTake(id) as Promise<StockTakeDto>),
    isPending,
    error,
  };
}
