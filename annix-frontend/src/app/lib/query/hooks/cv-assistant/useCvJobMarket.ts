import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CandidateJobMatch,
  type CreateJobMarketSourceDto,
  cvAssistantApiClient,
  type ExternalJob,
  type JobMarketSource,
  type JobMarketStats,
  type UpdateJobMarketSourceDto,
} from "@/app/lib/api/cvAssistantApi";
import { type CvExternalJobQueryParams, cvAssistantKeys } from "../../keys";

export function useCvJobMarketStats() {
  return useQuery<JobMarketStats>({
    queryKey: cvAssistantKeys.jobMarket.stats(),
    queryFn: () => cvAssistantApiClient.jobMarketStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvJobMarketSources() {
  return useQuery<JobMarketSource[]>({
    queryKey: cvAssistantKeys.jobMarket.sources(),
    queryFn: () => cvAssistantApiClient.jobMarketSources(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvExternalJobs(params?: CvExternalJobQueryParams) {
  return useQuery<{ jobs: ExternalJob[]; total: number }>({
    queryKey: cvAssistantKeys.jobMarket.jobs(params),
    queryFn: () =>
      cvAssistantApiClient.externalJobs({
        country: params?.country,
        category: params?.category,
        search: params?.search ?? undefined,
        page: params?.page,
        limit: params?.limit,
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvMatchingCandidates(jobId: number | null) {
  return useQuery<CandidateJobMatch[]>({
    queryKey: cvAssistantKeys.jobMarket.matchingCandidates(jobId!),
    queryFn: () => cvAssistantApiClient.matchingCandidatesForJob(jobId!),
    enabled: jobId !== null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvCreateJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobMarketSourceDto) =>
      cvAssistantApiClient.createJobMarketSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobMarket.all });
    },
  });
}

export function useCvUpdateJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJobMarketSourceDto }) =>
      cvAssistantApiClient.updateJobMarketSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobMarket.all });
    },
  });
}

export function useCvDeleteJobMarketSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.deleteJobMarketSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobMarket.all });
    },
  });
}

export function useCvTriggerIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: number) => cvAssistantApiClient.triggerIngestion(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobMarket.all });
    },
  });
}
