import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type SupplierPumpQuoteDetailResponse,
  type SupplierPumpQuoteListItem,
  type SupplierPumpQuoteStatus,
  supplierPortalApi,
} from "@/app/lib/api/supplierApi";
import { supplierKeys } from "../../keys";

export function useSupplierPumpQuotes(status?: SupplierPumpQuoteStatus) {
  return useQuery<SupplierPumpQuoteListItem[]>({
    queryKey: supplierKeys.pumpQuotes.list(status),
    queryFn: () => supplierPortalApi.getMyPumpQuotes(status),
  });
}

export function useSupplierPumpQuoteDetails(rfqId: number) {
  return useQuery<SupplierPumpQuoteDetailResponse>({
    queryKey: supplierKeys.pumpQuotes.detail(rfqId),
    queryFn: () => supplierPortalApi.getPumpQuoteDetails(rfqId),
    enabled: rfqId > 0,
  });
}

export function useDeclinePumpQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId, reason }: { rfqId: number; reason: string }) =>
      supplierPortalApi.declinePumpQuote(rfqId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.pumpQuotes.all });
    },
  });
}

export function useMarkPumpQuoteViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rfqId: number) => supplierPortalApi.markPumpQuoteViewed(rfqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.pumpQuotes.all });
    },
  });
}

export function useSubmitPumpQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rfqId,
      data,
    }: {
      rfqId: number;
      data: {
        unitPrice: number;
        totalPrice: number;
        leadTimeDays?: number;
        notes?: string;
        breakdown?: Record<string, number>;
      };
    }) => supplierPortalApi.submitPumpQuote(rfqId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.pumpQuotes.all });
    },
  });
}
