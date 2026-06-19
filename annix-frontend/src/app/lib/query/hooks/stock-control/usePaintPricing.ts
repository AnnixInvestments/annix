import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommitPaintPriceListImportInput,
  CreatePaintPriceListItemInput,
  MultiCoatQuoteInput,
  MultiCoatQuoteResult,
  PackOptionRequestItem,
  PackOptionResult,
  PaintPricingConfig,
  PaintPricingResponse,
  PaintQuoteInput,
  PaintQuoteResult,
  PreferredPaintOption,
  QuoteCatalogItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function usePaintPricing() {
  return useQuery<PaintPricingResponse>({
    queryKey: stockControlKeys.paintPricing.list(),
    queryFn: () => stockControlApiClient.paintPricing(),
  });
}

export function usePreferredPaints() {
  return useQuery<PreferredPaintOption[]>({
    queryKey: stockControlKeys.paintPricing.preferred(),
    queryFn: () => stockControlApiClient.preferredPaints(),
  });
}

export function usePaintQuoteCatalog() {
  return useQuery<QuoteCatalogItem[]>({
    queryKey: stockControlKeys.paintQuote.catalog(),
    queryFn: () => stockControlApiClient.paintQuoteCatalog(),
  });
}

export function useCreatePaintQuote() {
  return useMutation<PaintQuoteResult, Error, PaintQuoteInput>({
    mutationFn: (input: PaintQuoteInput) => stockControlApiClient.paintQuote(input),
  });
}

export function useCreateMultiCoatQuote() {
  return useMutation<MultiCoatQuoteResult, Error, MultiCoatQuoteInput>({
    mutationFn: (input: MultiCoatQuoteInput) => stockControlApiClient.paintMultiCoatQuote(input),
  });
}

export function useCreatePaintPackOptions() {
  return useMutation<PackOptionResult[], Error, PackOptionRequestItem[]>({
    mutationFn: (items: PackOptionRequestItem[]) => stockControlApiClient.paintPackOptions(items),
  });
}

export function useCreatePaintPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaintPriceListItemInput) =>
      stockControlApiClient.createPaintPriceItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useUpdatePaintPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; input: Partial<CreatePaintPriceListItemInput> }) =>
      stockControlApiClient.updatePaintPriceItem(params.id, params.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useDeletePaintPriceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deletePaintPriceItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useUpdatePaintPricingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: PaintPricingConfig) =>
      stockControlApiClient.updatePaintPricingConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useImportPaintPriceList() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.importPaintPriceList(file),
  });
}

export function useCommitPaintPriceListImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommitPaintPriceListImportInput) =>
      stockControlApiClient.commitPaintPriceListImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useEnrichPaintPriceSpecs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stockControlApiClient.enrichPaintPriceSpecs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}

export function useBulkUpliftPaintPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (upliftPercent: number) =>
      stockControlApiClient.bulkUpliftPaintPrices(upliftPercent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.paintPricing.all });
    },
  });
}
