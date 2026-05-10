import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type SeekerJobStats,
  type SeekerMatchingConsentStatus,
  type SeekerRecommendedJobsResponse,
  type SeekerRematchResponse,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvSeekerJobStats(enabled: boolean = true) {
  return useQuery<SeekerJobStats>({
    queryKey: cvAssistantKeys.seekerJobs.stats(),
    queryFn: () => cvAssistantApiClient.seekerJobStats(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvSeekerRecommendedJobs(enabled: boolean = true) {
  return useQuery<SeekerRecommendedJobsResponse>({
    queryKey: cvAssistantKeys.seekerJobs.recommended(),
    queryFn: () => cvAssistantApiClient.seekerRecommendedJobs(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvDismissSeekerMatch() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (matchId) => cvAssistantApiClient.dismissSeekerMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

export function useCvSeekerRematch() {
  const queryClient = useQueryClient();
  return useMutation<SeekerRematchResponse, Error, void>({
    mutationFn: () => cvAssistantApiClient.triggerSeekerRematch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

export function useCvWithdrawSeekerMatching() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number; matchesCleared: number }, Error, void>({
    mutationFn: () => cvAssistantApiClient.withdrawSeekerMatching(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

export function useCvSeekerMatchingConsent(enabled: boolean = true) {
  return useQuery<SeekerMatchingConsentStatus>({
    queryKey: cvAssistantKeys.seekerJobs.consent(),
    queryFn: () => cvAssistantApiClient.seekerMatchingConsent(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCvGrantSeekerMatchingConsent() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number }, Error, void>({
    mutationFn: () => cvAssistantApiClient.grantSeekerMatchingConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}
