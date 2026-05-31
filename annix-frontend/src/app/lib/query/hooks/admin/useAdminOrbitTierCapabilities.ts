import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitTierCapability,
  type OrbitTierFeatures,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitTierCapabilities() {
  return useQuery<OrbitTierCapability[]>({
    queryKey: adminKeys.orbitTierCapabilities.list(),
    queryFn: () => adminApiClient.orbitTierCapabilities(),
    staleTime: 60 * 1000,
  });
}

export function useAdminUpdateOrbitTierCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      tier: string;
      matchStrictness?: string;
      maxJobResults?: number | null;
      features?: Partial<OrbitTierFeatures>;
    }) =>
      adminApiClient.updateOrbitTierCapability(input.tier, {
        matchStrictness: input.matchStrictness,
        maxJobResults: input.maxJobResults,
        features: input.features,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitTierCapabilities.all });
    },
  });
}
