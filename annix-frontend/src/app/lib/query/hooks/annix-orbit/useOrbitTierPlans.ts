import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type SeekerTierPlan } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "@/app/lib/query/keys/annixOrbitKeys";

export function useOrbitTierPlans(enabled: boolean = true) {
  return useQuery<SeekerTierPlan[]>({
    queryKey: annixOrbitKeys.tierPlans.list(),
    queryFn: () => annixOrbitApiClient.tierPlans(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
