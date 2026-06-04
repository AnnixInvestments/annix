import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type PublicJob,
  type SeekerColdStartJobsResponse,
  type SeekerDismissReason,
  type SeekerJobStats,
  type SeekerMatchingConsentStatus,
  type SeekerMute,
  type SeekerRecommendedFilters,
  type SeekerRecommendedJobsResponse,
  type SeekerRematchResponse,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys, type CvExternalJobQueryParams } from "../../keys";

export function useOrbitSeekerJobStats(enabled: boolean = true) {
  return useQuery<SeekerJobStats>({
    queryKey: annixOrbitKeys.seekerJobs.stats(),
    queryFn: () => annixOrbitApiClient.seekerJobStats(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitSeekerRecommendedJobs(
  enabled: boolean = true,
  options: { refetchInterval?: number | false; filters?: SeekerRecommendedFilters } = {},
) {
  const requestedInterval = options.refetchInterval;
  const baseInterval = requestedInterval === undefined ? false : requestedInterval;
  const optionFilters = options.filters;
  const filters = optionFilters === undefined ? {} : optionFilters;
  return useQuery<SeekerRecommendedJobsResponse>({
    queryKey: annixOrbitKeys.seekerJobs.recommended(filters),
    queryFn: () => annixOrbitApiClient.seekerRecommendedJobs(filters),
    enabled,
    staleTime: 2 * 60 * 1000,
    // eslint-disable-next-line no-restricted-syntax -- caller opts in at 120s; polling self-stops once matches land so cold-start detection doesn't run forever
    refetchInterval: (query) => {
      if (baseInterval === false) return false;
      const data = query.state.data;
      const hasMatches = data ? data.matches.length > 0 : false;
      return hasMatches ? false : baseInterval;
    },
  });
}

export function useOrbitSeekerColdStartJobs(enabled: boolean = true) {
  return useQuery<SeekerColdStartJobsResponse>({
    queryKey: annixOrbitKeys.seekerJobs.coldStart(),
    queryFn: () => annixOrbitApiClient.seekerColdStartJobs(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitSeekerBrowseJobs(
  params?: CvExternalJobQueryParams,
  enabled: boolean = true,
) {
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

export function useOrbitSeekerDismissReasons(enabled: boolean = true) {
  return useQuery<SeekerDismissReason[]>({
    queryKey: annixOrbitKeys.dismissReasons.list(),
    queryFn: () => annixOrbitApiClient.listSeekerDismissReasons(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitDismissSeekerMatch() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { matchId: number; reason?: string }>({
    mutationFn: ({ matchId, reason }) => annixOrbitApiClient.dismissSeekerMatch(matchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitReportJobDelisted() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (externalJobId) => annixOrbitApiClient.reportJobDelisted(externalJobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitSeekerRematch() {
  const queryClient = useQueryClient();
  return useMutation<SeekerRematchResponse, Error, void>({
    mutationFn: () => annixOrbitApiClient.triggerSeekerRematch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitWithdrawSeekerMatching() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number; matchesCleared: number }, Error, void>({
    mutationFn: () => annixOrbitApiClient.withdrawSeekerMatching(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitSeekerMatchingConsent(enabled: boolean = true) {
  return useQuery<SeekerMatchingConsentStatus>({
    queryKey: annixOrbitKeys.seekerJobs.consent(),
    queryFn: () => annixOrbitApiClient.seekerMatchingConsent(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitGrantSeekerMatchingConsent() {
  const queryClient = useQueryClient();
  return useMutation<{ candidatesAffected: number }, Error, void>({
    mutationFn: () => annixOrbitApiClient.grantSeekerMatchingConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitSeekerMutes(enabled: boolean = true) {
  return useQuery<{ mutes: SeekerMute[] }>({
    queryKey: annixOrbitKeys.seekerJobs.mutes(),
    queryFn: () => annixOrbitApiClient.listSeekerMutes(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitMuteSeekerCompany() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (company) => annixOrbitApiClient.muteSeekerCompany(company),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitMuteSeekerCategory() {
  const queryClient = useQueryClient();
  return useMutation<{ created: boolean; mute: SeekerMute }, Error, string>({
    mutationFn: (category) => annixOrbitApiClient.muteSeekerCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

export function useOrbitRevokeSeekerMute() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (muteId) => annixOrbitApiClient.revokeSeekerMute(muteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}
