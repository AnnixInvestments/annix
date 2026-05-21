import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type PublicJob,
  type SeekerColdStartJobsResponse,
  type SeekerJobStats,
  type SeekerMatchingConsentStatus,
  type SeekerMute,
  type SeekerRecommendedJobsResponse,
  type SeekerRematchResponse,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys, type CvExternalJobQueryParams } from "../../keys";

export function useCvSeekerJobStats(enabled: boolean = true) {
  return useQuery<SeekerJobStats>({
    queryKey: annixOrbitKeys.seekerJobs.stats(),
    queryFn: () => annixOrbitApiClient.seekerJobStats(),
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
    queryKey: annixOrbitKeys.seekerJobs.recommended(),
    queryFn: () => annixOrbitApiClient.seekerRecommendedJobs(),
    enabled,
    staleTime: 2 * 60 * 1000,
    // eslint-disable-next-line no-restricted-syntax -- caller-controlled, defaults to off; only the seeker cold-start path opts in at 120s
    refetchInterval,
  });
}

export function useCvSeekerColdStartJobs(enabled: boolean = true) {
  return useQuery<SeekerColdStartJobsResponse>({
    queryKey: annixOrbitKeys.seekerJobs.coldStart(),
    queryFn: () => annixOrbitApiClient.seekerColdStartJobs(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvSeekerBrowseJobs(params?: CvExternalJobQueryParams, enabled: boolean = true) {
  return useQuery<{ jobs: PublicJob[]; total: number }>({
    queryKey: annixOrbitKeys.seekerJobs.browse(params),
    queryFn: () => {
      const rawSearch = params?.search;
      return annixOrbitApiClient.publicJobs({
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
    mutationFn: (matchId) => annixOrbitApiClient.dismissSeekerMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvSeekerRematch() {
  const queryClient = useQueryClient();
  return useMutation<SeekerRematchResponse, Error, void>({
    mutationFn: () => annixOrbitApiClient.triggerSeekerRematch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvWithdrawSeekerMatching() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number; matchesCleared: number }, Error, void>({
    mutationFn: () => annixOrbitApiClient.withdrawSeekerMatching(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvSeekerMatchingConsent(enabled: boolean = true) {
  return useQuery<SeekerMatchingConsentStatus>({
    queryKey: annixOrbitKeys.seekerJobs.consent(),
    queryFn: () => annixOrbitApiClient.seekerMatchingConsent(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCvGrantSeekerMatchingConsent() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number }, Error, void>({
    mutationFn: () => annixOrbitApiClient.grantSeekerMatchingConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvSeekerMutes(enabled: boolean = true) {
  return useQuery<{ mutes: SeekerMute[] }>({
    queryKey: annixOrbitKeys.seekerJobs.mutes(),
    queryFn: () => annixOrbitApiClient.listSeekerMutes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMuteSeekerCompany() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (company) => annixOrbitApiClient.muteSeekerCompany(company),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvMuteSeekerCategory() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (category) => annixOrbitApiClient.muteSeekerCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useCvRevokeSeekerMute() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (muteId) => annixOrbitApiClient.revokeSeekerMute(muteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}
