import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customerSupplierApi,
  type DirectoryFilters,
  type DirectorySupplier,
  type PreferredSupplier,
  type SupplierInvitation,
} from "@/app/lib/api/customerApi";
import { customerKeys } from "../../keys";

export function useCustomerPreferredSuppliers() {
  return useQuery<PreferredSupplier[]>({
    queryKey: customerKeys.suppliers.list(),
    queryFn: () => customerSupplierApi.getPreferredSuppliers(),
  });
}

export function useCustomerInvitations() {
  return useQuery<SupplierInvitation[]>({
    queryKey: customerKeys.suppliers.invitations(),
    queryFn: () => customerSupplierApi.getInvitations(),
  });
}

export function useAddPreferredSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      supplierProfileId?: number;
      supplierName?: string;
      supplierEmail?: string;
      priority?: number;
      notes?: string;
    }) => customerSupplierApi.addPreferredSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.suppliers.all });
    },
  });
}

export function useRemovePreferredSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerSupplierApi.removePreferredSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.suppliers.all });
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; supplierCompanyName?: string; message?: string }) =>
      customerSupplierApi.createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.suppliers.invitations(),
      });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerSupplierApi.cancelInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.suppliers.invitations(),
      });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerSupplierApi.resendInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.suppliers.invitations(),
      });
    },
  });
}

export function useSupplierDirectory(filters?: DirectoryFilters) {
  return useQuery<DirectorySupplier[]>({
    queryKey: customerKeys.suppliers.directory(filters as Record<string, unknown>),
    queryFn: () => customerSupplierApi.supplierDirectory(filters),
    enabled: filters !== undefined,
  });
}

export function useBlockSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierProfileId, reason }: { supplierProfileId: number; reason?: string }) =>
      customerSupplierApi.blockSupplier(supplierProfileId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.suppliers.all });
    },
  });
}

export function useUnblockSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (supplierProfileId: number) =>
      customerSupplierApi.unblockSupplier(supplierProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.suppliers.all });
    },
  });
}
