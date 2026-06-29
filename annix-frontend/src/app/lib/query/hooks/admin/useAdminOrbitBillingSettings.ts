import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitBillingModule,
  type OrbitBillingSettings,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitBillingSettings() {
  return useQuery<OrbitBillingSettings>({
    queryKey: adminKeys.orbitBillingSettings.all,
    queryFn: () => adminApiClient.orbitBillingSettings(),
    staleTime: 30 * 1000,
  });
}

export function useAdminSetOrbitBillingModuleEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ module, enabled }: { module: OrbitBillingModule; enabled: boolean }) =>
      adminApiClient.setOrbitBillingModuleEnabled(module, enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.orbitBillingSettings.all, data);
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitBillingSettings.all });
    },
  });
}
