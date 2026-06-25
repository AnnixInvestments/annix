import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type SeekerBillingStatusView,
  type SeekerCheckoutResult,
  type SeekerPayableTier,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "@/app/lib/query/keys/annixOrbitKeys";

export function useOrbitSeekerBillingStatus(enabled: boolean = true) {
  return useQuery<SeekerBillingStatusView>({
    queryKey: annixOrbitKeys.seekerBilling.status(),
    queryFn: () => annixOrbitApiClient.seekerBillingStatus(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitSeekerCheckout() {
  return useMutation<SeekerCheckoutResult, Error, SeekerPayableTier>({
    mutationFn: (tier) => annixOrbitApiClient.startSeekerCheckout(tier),
  });
}

export function useOrbitSeekerCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation<SeekerBillingStatusView, Error, void>({
    mutationFn: () => annixOrbitApiClient.cancelSeekerSubscription(),
    onSuccess: (data) => {
      queryClient.setQueryData<SeekerBillingStatusView>(
        annixOrbitKeys.seekerBilling.status(),
        data,
      );
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerBilling.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEntitlements.all });
    },
  });
}
