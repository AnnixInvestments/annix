import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommitPaintPriceListImportInput,
  CreatePaintPriceListItemInput,
  PaintPricingConfig,
  PaintPricingResponse,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function usePaintPricing() {
  return useQuery<PaintPricingResponse>({
    queryKey: stockControlKeys.paintPricing.list(),
    queryFn: () => stockControlApiClient.paintPricing(),
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
