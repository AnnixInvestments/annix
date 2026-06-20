import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommitRubberPriceListImportInput,
  CreateRubberPriceListItemInput,
  RubberPriceFamily,
  RubberPricingConfig,
  RubberPricingResponse,
  RubberQuoteCatalogItem,
  RubberQuoteInput,
  RubberQuoteResult,
  UpdateRubberPriceListItemInput,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useRubberPricing() {
  return useQuery<RubberPricingResponse>({
    queryKey: stockControlKeys.rubberPricing.list(),
    queryFn: () => stockControlApiClient.rubberPricing(),
  });
}

export function useRubberQuoteCatalog(family: RubberPriceFamily | null) {
  return useQuery<RubberQuoteCatalogItem[]>({
    queryKey: stockControlKeys.rubberQuote.catalog(family),
    queryFn: () => stockControlApiClient.rubberQuoteCatalog(family),
  });
}

export function useCreateRubberQuote() {
  return useMutation<RubberQuoteResult, Error, RubberQuoteInput>({
    mutationFn: (input: RubberQuoteInput) => stockControlApiClient.rubberQuote(input),
  });
}

export function useCreateRubberPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRubberPriceListItemInput) =>
      stockControlApiClient.createRubberPriceItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useUpdateRubberPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; input: UpdateRubberPriceListItemInput }) =>
      stockControlApiClient.updateRubberPriceItem(params.id, params.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useDeleteRubberPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteRubberPriceItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useUpdateRubberPricingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: RubberPricingConfig) =>
      stockControlApiClient.updateRubberPricingConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useBulkUpliftRubberPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (upliftPercent: number) =>
      stockControlApiClient.bulkUpliftRubberPrices(upliftPercent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useSeedRubberPriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stockControlApiClient.seedRubberPriceList(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}

export function useImportRubberPriceList() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.importRubberPriceList(file),
  });
}

export function useCommitRubberPriceListImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommitRubberPriceListImportInput) =>
      stockControlApiClient.commitRubberPriceListImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberPricing.all });
    },
  });
}
