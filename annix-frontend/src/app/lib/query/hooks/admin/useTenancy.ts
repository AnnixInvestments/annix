import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateTenantPayload,
  type InviteTenantUserPayload,
  type TenantSummary,
  tenancyAdminApi,
} from "@/app/lib/api/tenancyAdminApi";
import { licensingKeys } from "../../keys";

export function useTenants(moduleKey: string) {
  return useQuery<TenantSummary[]>({
    queryKey: licensingKeys.tenants(moduleKey),
    queryFn: () => tenancyAdminApi.list(moduleKey),
  });
}

export function useCreateTenant(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => tenancyAdminApi.create(moduleKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.tenants(moduleKey) });
    },
  });
}

export function useInviteTenantUser(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, payload }: { companyId: number; payload: InviteTenantUserPayload }) =>
      tenancyAdminApi.inviteUser(moduleKey, companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.tenants(moduleKey) });
    },
  });
}

export function useTransferTenantOwner(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, newOwnerUserId }: { companyId: number; newOwnerUserId: number }) =>
      tenancyAdminApi.transferOwner(moduleKey, companyId, newOwnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licensingKeys.tenants(moduleKey) });
    },
  });
}
