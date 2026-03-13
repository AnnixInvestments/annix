import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DeliveryNote,
  JobCard,
  StockControlLocation,
  StockItem,
  SupplierInvoice,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useJobCards(status?: string) {
  return useQuery<JobCard[]>({
    queryKey: stockControlKeys.jobCards.list(status),
    queryFn: async () => {
      const data = await stockControlApiClient.jobCards(status === "all" ? undefined : status);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDataBookStatuses(ids: number[]) {
  return useQuery<Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>>({
    queryKey: stockControlKeys.jobCards.dataBookStatuses(ids),
    queryFn: () => stockControlApiClient.dataBookStatusBulk(ids),
    enabled: ids.length > 0,
  });
}

export function useCreateJobCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobCard>) => stockControlApiClient.createJobCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

export function useDeleteJobCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteJobCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
    },
  });
}

export function useInventoryItems(params: Record<string, string>) {
  return useQuery<{ items: StockItem[]; total: number }>({
    queryKey: stockControlKeys.inventory.list(params),
    queryFn: () => stockControlApiClient.stockItems(params),
  });
}

export function useInventoryGrouped(search?: string, locationId?: number) {
  return useQuery<{ category: string; items: StockItem[] }[]>({
    queryKey: stockControlKeys.inventory.grouped(search, locationId),
    queryFn: () => stockControlApiClient.stockItemsGrouped(search, locationId),
  });
}

export function useInventoryCategories() {
  return useQuery<string[]>({
    queryKey: stockControlKeys.inventory.categories(),
    queryFn: () => stockControlApiClient.categories(),
    staleTime: 60_000,
  });
}

export function useInventoryLocations() {
  return useQuery<StockControlLocation[]>({
    queryKey: stockControlKeys.inventory.locations(),
    queryFn: () => stockControlApiClient.locations(),
    staleTime: 60_000,
  });
}

export function useInvoices() {
  return useQuery<SupplierInvoice[]>({
    queryKey: stockControlKeys.invoices.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.supplierInvoices();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeliveryNotes() {
  return useQuery<DeliveryNote[]>({
    queryKey: stockControlKeys.deliveries.list(),
    queryFn: async () => {
      const data = await stockControlApiClient.deliveryNotes();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.invoices.all });
    },
  });
}

export function useCreateDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: string;
      notes?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number }[];
    }) => stockControlApiClient.createDeliveryNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
    },
  });
}

export function useDeleteDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteDeliveryNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
    },
  });
}

export function useLinkDeliveryNoteToStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.linkDeliveryNoteToStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
      queryClient.invalidateQueries({ queryKey: stockControlKeys.inventory.all });
    },
  });
}

export function useInvalidateDeliveries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.deliveries.all });
}

export function useInvalidateInvoices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.invoices.all });
}

export function useInvalidateJobCards() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.jobCards.all });
}

export function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.inventory.all });
}
