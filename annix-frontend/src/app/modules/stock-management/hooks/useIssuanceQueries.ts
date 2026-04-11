"use client";

import { useEffect, useMemo, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type {
  CreateIssuanceSessionDto,
  IssuanceSessionDto,
  IssuanceSessionFiltersDto,
  IssuanceSessionListResultDto,
} from "../types/issuance";
import type { IssuableProductListResultDto, IssuableProductType } from "../types/products";

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

export function useIssuableProducts(
  filters: {
    productType?: IssuableProductType;
    active?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): AsyncState<IssuableProductListResultDto> {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<IssuableProductListResultDto>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));
    client
      .listProducts(filters)
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
  }, [client, filtersKey]);

  return state;
}

export function useIssuanceSessions(
  filters: IssuanceSessionFiltersDto = {},
): AsyncState<IssuanceSessionListResultDto> {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<IssuanceSessionListResultDto>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));
    client
      .listIssuanceSessions(filters)
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
  }, [client, filtersKey]);

  return state;
}

export interface CreateIssuanceMutation {
  createSession: (dto: CreateIssuanceSessionDto) => Promise<IssuanceSessionDto>;
  isPending: boolean;
  error: Error | null;
}

export function useCreateIssuanceSession(): CreateIssuanceMutation {
  const client = useApiClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = async (dto: CreateIssuanceSessionDto) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await client.createIssuanceSession(dto);
      return result;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsPending(false);
    }
  };

  return { createSession, isPending, error };
}
