import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type SeekerEntitlements } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "@/app/lib/query/keys/annixOrbitKeys";

export function useOrbitSeekerEntitlements(enabled: boolean = true) {
  return useQuery<SeekerEntitlements>({
    queryKey: annixOrbitKeys.seekerEntitlements.detail(),
    queryFn: () => annixOrbitApiClient.seekerEntitlements(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
