import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AddOnPayload,
  licensingAdminApi,
  type TierPricingPayload,
} from "@/app/lib/api/licensingAdminApi";
import type { ModuleCatalog } from "@/app/lib/query/hooks";
import { licensingKeys } from "../../keys";

export function useAdminLicensingCatalog(moduleKey: string) {
  return useQuery<ModuleCatalog>({
    queryKey: licensingKeys.adminCatalog(moduleKey),
    queryFn: () => licensingAdminApi.catalog(moduleKey),
  });
}

export function useSetTierPricing(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tierKey, payload }: { tierKey: string; payload: TierPricingPayload }) =>
      licensingAdminApi.setTierPricing(moduleKey, tierKey, payload),
    onSuccess: (catalog) => {
      queryClient.setQueryData(licensingKeys.adminCatalog(moduleKey), catalog);
      queryClient.invalidateQueries({ queryKey: licensingKeys.catalog(moduleKey) });
    },
  });
}

export function useSetTierFeatures(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tierKey, featureKeys }: { tierKey: string; featureKeys: string[] }) =>
      licensingAdminApi.setTierFeatures(moduleKey, tierKey, featureKeys),
    onSuccess: (catalog) => {
      queryClient.setQueryData(licensingKeys.adminCatalog(moduleKey), catalog);
      queryClient.invalidateQueries({ queryKey: licensingKeys.catalog(moduleKey) });
    },
  });
}

export function useSetAddOn(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addOnKey, payload }: { addOnKey: string; payload: AddOnPayload }) =>
      licensingAdminApi.setAddOn(moduleKey, addOnKey, payload),
    onSuccess: (catalog) => {
      queryClient.setQueryData(licensingKeys.adminCatalog(moduleKey), catalog);
      queryClient.invalidateQueries({ queryKey: licensingKeys.catalog(moduleKey) });
    },
  });
}
