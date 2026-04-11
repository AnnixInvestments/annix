"use client";

import { useCallback, useEffect, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type {
  CreateProductCategoryInput,
  CreateRubberCompoundInput,
  CreateVarianceCategoryInput,
  LocationCandidateInput,
  LocationClassificationSuggestionDto,
  ProductDatasheetDto,
  ResolveDispositionInput,
  RubberCompoundDto,
  StockHoldItemDto,
  VarianceCategoryDto,
} from "../types/admin";
import type { IssuableProductType, ProductCategoryDto } from "../types/products";

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useApiClient(): StockManagementApiClient {
  const config = useStockManagementConfig();
  return new StockManagementApiClient({ baseUrl: config.apiBaseUrl });
}

function useAsync<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps array is the contract
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useProductCategories(
  productType?: IssuableProductType,
): AsyncState<ProductCategoryDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listProductCategories(productType), [client, productType]);
}

export function useRubberCompounds(includeInactive = false): AsyncState<RubberCompoundDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listRubberCompounds(includeInactive), [client, includeInactive]);
}

export function useVarianceCategories(includeInactive = false): AsyncState<VarianceCategoryDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listVarianceCategories(includeInactive), [client, includeInactive]);
}

export function useStockHoldPending(): AsyncState<StockHoldItemDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listPendingStockHold(), [client]);
}

export function useStockHoldAging(): AsyncState<{
  fresh: number;
  week: number;
  month: number;
  older: number;
}> {
  const client = useApiClient();
  return useAsync(() => client.stockHoldAging(), [client]);
}

export function useProductDatasheets(
  productType?: ProductDatasheetDto["productType"],
): AsyncState<ProductDatasheetDto[]> {
  const client = useApiClient();
  return useAsync(() => client.listProductDatasheets(productType), [client, productType]);
}

export interface AdminMutations {
  createProductCategory: (dto: CreateProductCategoryInput) => Promise<ProductCategoryDto>;
  updateProductCategory: (
    id: number,
    dto: Partial<CreateProductCategoryInput>,
  ) => Promise<ProductCategoryDto>;
  deleteProductCategory: (id: number) => Promise<ProductCategoryDto>;
  seedProductCategories: () => Promise<{ created: number }>;
  createRubberCompound: (dto: CreateRubberCompoundInput) => Promise<RubberCompoundDto>;
  updateRubberCompound: (
    id: number,
    dto: Partial<CreateRubberCompoundInput> & { active?: boolean },
  ) => Promise<RubberCompoundDto>;
  seedRubberCompounds: () => Promise<{ created: number }>;
  createVarianceCategory: (dto: CreateVarianceCategoryInput) => Promise<VarianceCategoryDto>;
  updateVarianceCategory: (
    id: number,
    dto: Partial<CreateVarianceCategoryInput> & { active?: boolean },
  ) => Promise<VarianceCategoryDto>;
  seedVarianceCategories: () => Promise<{ created: number }>;
  resolveStockHold: (id: number, dto: ResolveDispositionInput) => Promise<StockHoldItemDto>;
  verifyDatasheet: (id: number) => Promise<ProductDatasheetDto>;
  classifyUnassignedLocations: (
    locations: LocationCandidateInput[],
  ) => Promise<LocationClassificationSuggestionDto[]>;
  applyLocationClassifications: (
    decisions: Array<{ productId: number; locationId: number | null }>,
  ) => Promise<{ updated: number }>;
  isPending: boolean;
  error: Error | null;
}

export function useAdminMutations(): AdminMutations {
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
    createProductCategory: (dto) => wrap(() => client.createProductCategory(dto)),
    updateProductCategory: (id, dto) => wrap(() => client.updateProductCategory(id, dto)),
    deleteProductCategory: (id) => wrap(() => client.deleteProductCategory(id)),
    seedProductCategories: () => wrap(() => client.seedProductCategories()),
    createRubberCompound: (dto) => wrap(() => client.createRubberCompound(dto)),
    updateRubberCompound: (id, dto) => wrap(() => client.updateRubberCompound(id, dto)),
    seedRubberCompounds: () => wrap(() => client.seedRubberCompounds()),
    createVarianceCategory: (dto) => wrap(() => client.createVarianceCategory(dto)),
    updateVarianceCategory: (id, dto) => wrap(() => client.updateVarianceCategory(id, dto)),
    seedVarianceCategories: () => wrap(() => client.seedVarianceCategories()),
    resolveStockHold: (id, dto) => wrap(() => client.resolveStockHold(id, dto)),
    verifyDatasheet: (id) => wrap(() => client.verifyDatasheet(id)),
    classifyUnassignedLocations: (locations) =>
      wrap(() => client.classifyUnassignedLocations(locations)),
    applyLocationClassifications: (decisions) =>
      wrap(() => client.applyLocationClassifications(decisions)),
    isPending,
    error,
  };
}
