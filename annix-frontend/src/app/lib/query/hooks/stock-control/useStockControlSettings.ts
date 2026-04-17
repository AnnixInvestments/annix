import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isArray } from "es-toolkit/compat";
import type { CompanyRole, StockControlTeamMember } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useCompanyRoles() {
  return useQuery<CompanyRole[]>({
    queryKey: stockControlKeys.settings.companyRoles(),
    queryFn: async () => {
      const data = await stockControlApiClient.companyRoles();
      return isArray(data) ? data : [];
    },
  });
}

export function useSettingsTeamMembers() {
  return useQuery<StockControlTeamMember[]>({
    queryKey: stockControlKeys.settings.teamMembers(),
    queryFn: async () => {
      const data = await stockControlApiClient.teamMembers();
      return isArray(data) ? data : [];
    },
  });
}

export function useInvalidateCompanyRoles() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
}

export function useInvalidateSettingsTeamMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.teamMembers() });
}

export function useUpdateNavRbacConfig() {
  return useMutation({
    mutationFn: (config: Record<string, string[]>) =>
      stockControlApiClient.updateNavRbacConfig(config),
  });
}

export function useCreateCompanyRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { key: string; label: string }) =>
      stockControlApiClient.createCompanyRole(params.key, params.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
    },
  });
}

export function useUpdateCompanyRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; label: string }) =>
      stockControlApiClient.updateCompanyRole(params.id, params.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
    },
  });
}

export function useDeleteCompanyRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteCompanyRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
    },
  });
}

export function useReorderCompanyRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => stockControlApiClient.reorderCompanyRoles(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.settings.companyRoles() });
    },
  });
}

export function useActionPermissions() {
  return useMutation({
    mutationFn: () => stockControlApiClient.actionPermissions(),
  });
}

export function useUpdateActionPermissions() {
  return useMutation({
    mutationFn: (config: Record<string, string[]>) =>
      stockControlApiClient.updateActionPermissions(config),
  });
}

export function useUserLocationAssignments() {
  return useQuery<import("@/app/lib/api/stockControlApi").UserLocationSummary[]>({
    queryKey: [...stockControlKeys.settings.all, "user-locations"] as const,
    queryFn: async () => {
      const data = await stockControlApiClient.userLocationAssignments();
      return isArray(data) ? data : [];
    },
  });
}

export function useUpdateUserLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: number; locationIds: number[] }) =>
      stockControlApiClient.updateUserLocations(params.userId, params.locationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...stockControlKeys.settings.all, "user-locations"],
      });
    },
  });
}

export function useUpdateCompanyDetails() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => stockControlApiClient.updateCompanyDetails(data),
  });
}

export function useScrapeBranding() {
  return useMutation({
    mutationFn: (url: string) => stockControlApiClient.scrapeBranding(url),
  });
}

export function useProcessBrandingSelection() {
  return useMutation({
    mutationFn: (data: Parameters<typeof stockControlApiClient.processBrandingSelection>[0]) =>
      stockControlApiClient.processBrandingSelection(data),
  });
}

export function useSetBranding() {
  return useMutation({
    mutationFn: (data: Parameters<typeof stockControlApiClient.setBranding>[0]) =>
      stockControlApiClient.setBranding(data),
  });
}

export function usePendingAdminTransfer() {
  return useMutation({
    mutationFn: () => stockControlApiClient.pendingAdminTransfer(),
  });
}

export function useInitiateAdminTransfer() {
  return useMutation({
    mutationFn: (params: Parameters<typeof stockControlApiClient.initiateAdminTransfer>) =>
      stockControlApiClient.initiateAdminTransfer(...params),
  });
}

export function useResendAdminTransfer() {
  return useMutation({
    mutationFn: () => stockControlApiClient.resendAdminTransfer(),
  });
}

export function useCancelAdminTransfer() {
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.cancelAdminTransfer(id),
  });
}
