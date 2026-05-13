import type { TradeProfile } from "@annix/product-data/sa-market";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

interface TradeProfileResponse {
  profile: TradeProfile;
  candidateIds: number[];
}

export function useCvSeekerTradeProfile(enabled: boolean = true) {
  return useQuery<TradeProfileResponse>({
    queryKey: cvAssistantKeys.seekerTradeProfile.detail(),
    queryFn: () => cvAssistantApiClient.seekerTradeProfile(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvUpsertSeekerTradeProfile() {
  const queryClient = useQueryClient();
  return useMutation<{ saved: boolean; candidateIds: number[] }, Error, TradeProfile>({
    mutationFn: (profile) => cvAssistantApiClient.upsertSeekerTradeProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerTradeProfile.all });
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

interface AutofillResponse {
  extracted: boolean;
  profile: TradeProfile;
  candidateIds: number[];
  reason?: "no-candidate" | "no-cv-text" | "no-trade-keywords" | "ai-failed";
}

export function useCvAutofillSeekerTradeProfile() {
  const queryClient = useQueryClient();
  return useMutation<AutofillResponse, Error, void>({
    mutationFn: () => cvAssistantApiClient.autofillSeekerTradeProfileFromCv(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerTradeProfile.all });
    },
  });
}
