import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitTierCapability,
  type OrbitTierFeatures,
  type OrbitTierPricing,
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
      monthlyNixRuns?: number | null;
      monthlyCvBuilds?: number | null;
      features?: Partial<OrbitTierFeatures>;
      pricing?: Partial<OrbitTierPricing>;
    }) =>
      adminApiClient.updateOrbitTierCapability(input.tier, {
        matchStrictness: input.matchStrictness,
        maxJobResults: input.maxJobResults,
        monthlyNixRuns: input.monthlyNixRuns,
        monthlyCvBuilds: input.monthlyCvBuilds,
        features: input.features,
        pricing: input.pricing,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitTierCapabilities.all });
    },
  });
}

export function useAdminInviteSeekerTrial() {
  return useMutation({
    mutationFn: (input: { email: string; tier: string; freeDays: number }) =>
      adminApiClient.inviteSeekerTrial(input.email, input.tier, input.freeDays),
  });
}
