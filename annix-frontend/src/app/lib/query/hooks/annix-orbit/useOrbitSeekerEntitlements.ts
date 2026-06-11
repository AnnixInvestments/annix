import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useOrbitSelectSeekerPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tier: string) => annixOrbitApiClient.selectSeekerPlan(tier),
    onSuccess: (data) => {
      queryClient.setQueryData<SeekerEntitlements>(
        annixOrbitKeys.seekerEntitlements.detail(),
        data,
      );
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEntitlements.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}
