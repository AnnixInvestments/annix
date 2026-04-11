import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type RfqItemDetail,
  type SupplierBoqDetailResponse,
  type SupplierBoqListItem,
  type SupplierBoqStatus,
  supplierPortalApi,
} from "@/app/lib/api/supplierApi";
import { supplierKeys } from "../../keys";

export function useSupplierBoqs(status?: SupplierBoqStatus) {
  return useQuery<SupplierBoqListItem[]>({
    queryKey: supplierKeys.boqs.list(status),
    queryFn: () => supplierPortalApi.getMyBoqs(status),
  });
}

export function useSupplierBoqDetail(boqId: number) {
  return useMutation<SupplierBoqDetailResponse, Error, void>({
    mutationFn: () => supplierPortalApi.getBoqDetails(boqId),
  });
}

export function useSupplierRfqItems(boqId: number) {
  return useMutation<RfqItemDetail[], Error, void>({
    mutationFn: () => supplierPortalApi.getRfqItems(boqId),
  });
}

export function useSaveQuoteProgress() {
  return useMutation({
    mutationFn: ({
      boqId,
      data,
    }: {
      boqId: number;
      data: {
        pricingInputs: Record<string, any>;
        unitPrices: Record<string, Record<number, number>>;
        weldUnitPrices: Record<string, number>;
      };
    }) => supplierPortalApi.saveQuoteProgress(boqId, data),
  });
}

export function useSubmitQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boqId,
      data,
    }: {
      boqId: number;
      data: {
        pricingInputs: Record<string, any>;
        unitPrices: Record<string, Record<number, number>>;
        weldUnitPrices: Record<string, number>;
        notes?: string;
      };
    }) => supplierPortalApi.submitQuote(boqId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all });
    },
  });
}

export function useDeclineBoq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boqId, reason }: { boqId: number; reason: string }) =>
      supplierPortalApi.declineBoq(boqId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all });
    },
  });
}

export function useMarkBoqViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boqId: number) => supplierPortalApi.markBoqViewed(boqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all });
    },
  });
}

export function useSetBoqReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boqId, reminderDays }: { boqId: number; reminderDays: string }) =>
      supplierPortalApi.setBoqReminder(boqId, reminderDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.boqs.all });
    },
  });
}
