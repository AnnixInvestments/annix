import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type PublicJob,
  type SeekerColdStartJobsResponse,
  type SeekerJobStats,
  type SeekerMatchingConsentStatus,
  type SeekerMute,
  type SeekerRecommendedJobsResponse,
  type SeekerRematchResponse,
} from "@/app/lib/api/cvAssistantApi";
import { type CvExternalJobQueryParams, cvAssistantKeys } from "../../keys";

export function useCvSeekerJobStats(enabled: boolean = true) {
  return useQuery<SeekerJobStats>({
    queryKey: cvAssistantKeys.seekerJobs.stats(),
    queryFn: () => cvAssistantApiClient.seekerJobStats(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvSeekerRecommendedJobs(
  enabled: boolean = true,
  options: { refetchInterval?: number | false } = {},
) {
  const requestedInterval = options.refetchInterval;
  const refetchInterval = requestedInterval === undefined ? false : requestedInterval;
  return useQuery<SeekerRecommendedJobsResponse>({
    queryKey: cvAssistantKeys.seekerJobs.recommended(),
    queryFn: () => cvAssistantApiClient.seekerRecommendedJobs(),
    enabled,
    staleTime: 2 * 60 * 1000,
    // eslint-disable-next-line no-restricted-syntax -- caller-controlled, defaults to off; only the seeker cold-start path opts in at 120s
    refetchInterval,
  });
}

export function useCvSeekerColdStartJobs(enabled: boolean = true) {
  return useQuery<SeekerColdStartJobsResponse>({
    queryKey: cvAssistantKeys.seekerJobs.coldStart(),
    queryFn: () => cvAssistantApiClient.seekerColdStartJobs(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvSeekerBrowseJobs(params?: CvExternalJobQueryParams, enabled: boolean = true) {
  return useQuery<{ jobs: PublicJob[]; total: number }>({
    queryKey: cvAssistantKeys.seekerJobs.browse(params),
    queryFn: () => {
      const rawSearch = params?.search;
      return cvAssistantApiClient.publicJobs({
        country: params?.country,
        category: params?.category,
        search: rawSearch || undefined,
        page: params?.page,
        limit: params?.limit,
      });
    },
    enabled,
    staleTime: 5 * 60 * 1000,
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

export function useCvSeekerMutes(enabled: boolean = true) {
  return useQuery<{ mutes: SeekerMute[] }>({
    queryKey: cvAssistantKeys.seekerJobs.mutes(),
    queryFn: () => cvAssistantApiClient.listSeekerMutes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMuteSeekerCompany() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (company) => cvAssistantApiClient.muteSeekerCompany(company),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

export function useCvMuteSeekerCategory() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (category) => cvAssistantApiClient.muteSeekerCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}

export function useCvRevokeSeekerMute() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (muteId) => cvAssistantApiClient.revokeSeekerMute(muteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}
