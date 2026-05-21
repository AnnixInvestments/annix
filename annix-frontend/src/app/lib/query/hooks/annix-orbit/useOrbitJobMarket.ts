import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CandidateJobMatch,
  type CreateJobMarketSourceDto,
  type ExternalJob,
  type JobMarketSource,
  type JobMarketStats,
  type JobSourceProviderInfo,
  type UpdateJobMarketSourceDto,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys, type CvExternalJobQueryParams } from "../../keys";

export function useOrbitJobMarketProviders() {
  return useQuery<JobSourceProviderInfo[]>({
    queryKey: annixOrbitKeys.jobMarket.providers(),
    queryFn: () => annixOrbitApiClient.jobMarketProviders(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useOrbitJobMarketStats() {
  return useQuery<JobMarketStats>({
    queryKey: annixOrbitKeys.jobMarket.stats(),
    queryFn: () => annixOrbitApiClient.jobMarketStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitJobMarketSources() {
  return useQuery<JobMarketSource[]>({
    queryKey: annixOrbitKeys.jobMarket.sources(),
    queryFn: () => annixOrbitApiClient.jobMarketSources(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitExternalJobs(params?: CvExternalJobQueryParams) {
  return useQuery<{ jobs: ExternalJob[]; total: number }>({
    queryKey: annixOrbitKeys.jobMarket.jobs(params),
    queryFn: () => {
      const rawSearch = params?.search;

      return annixOrbitApiClient.externalJobs({
        country: params?.country,
        category: params?.category,
        search: rawSearch || undefined,
        page: params?.page,
        limit: params?.limit,
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitMatchingCandidates(jobId: number | null) {
  return useQuery<CandidateJobMatch[]>({
    queryKey: annixOrbitKeys.jobMarket.matchingCandidates(jobId!),
    queryFn: () => annixOrbitApiClient.matchingCandidatesForJob(jobId!),
    enabled: jobId !== null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobMarketSourceDto) => annixOrbitApiClient.createJobMarketSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobMarket.all });
    },
  });
}

export function useOrbitUpdateJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJobMarketSourceDto }) =>
      annixOrbitApiClient.updateJobMarketSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobMarket.all });
    },
  });
}

export function useOrbitDeleteJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteJobMarketSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobMarket.all });
    },
  });
}

export function useOrbitTriggerIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: number) => annixOrbitApiClient.triggerIngestion(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobMarket.all });
    },
  });
}
