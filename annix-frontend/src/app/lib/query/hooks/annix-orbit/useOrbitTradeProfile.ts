import type { TradeProfile } from "@annix/product-data/sa-market";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

interface TradeProfileResponse {
  profile: TradeProfile;
  candidateIds: number[];
}

export function useOrbitSeekerTradeProfile(enabled: boolean = true) {
  return useQuery<TradeProfileResponse>({
    queryKey: annixOrbitKeys.seekerTradeProfile.detail(),
    queryFn: () => annixOrbitApiClient.seekerTradeProfile(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitUpsertSeekerTradeProfile() {
  const queryClient = useQueryClient();
  return useMutation<{ saved: boolean; candidateIds: number[] }, Error, TradeProfile>({
    mutationFn: (profile) => annixOrbitApiClient.upsertSeekerTradeProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerTradeProfile.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

interface AutofillResponse {
  extracted: boolean;
  profile: TradeProfile;
  candidateIds: number[];
  reason?: "no-candidate" | "no-cv-text" | "no-trade-keywords" | "ai-failed";
}

export function useOrbitAutofillSeekerTradeProfile() {
  const queryClient = useQueryClient();
  return useMutation<AutofillResponse, Error, void>({
    mutationFn: () => annixOrbitApiClient.autofillSeekerTradeProfileFromCv(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerTradeProfile.all });
    },
  });
}
