import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AssistedPostingPackEntry,
  annixOrbitApiClient,
  type JobDistributionEntry,
  type JobPosting,
  type PortalAdapterSummary,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitPortalAdapters() {
  return useQuery<PortalAdapterSummary[]>({
    queryKey: ["annix-orbit", "portal-adapters"],
    queryFn: () => annixOrbitApiClient.portalAdapters(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useOrbitJobDistribution(jobPostingId: number | null) {
  return useQuery<JobDistributionEntry[]>({
    queryKey: ["annix-orbit", "job-distribution", jobPostingId ?? 0],
    queryFn: () => annixOrbitApiClient.jobDistribution(jobPostingId as number),
    enabled: jobPostingId !== null && jobPostingId > 0,
    staleTime: 30 * 1000,
  });
}

export function useOrbitMarkChannelSubmitted() {
  const queryClient = useQueryClient();
  return useMutation<
    { portalCode: string; status: string },
    Error,
    { id: number; portalCode: string; portalUrl?: string }
  >({
    mutationFn: ({ id, portalCode, portalUrl }) =>
      annixOrbitApiClient.markChannelSubmitted(id, portalCode, portalUrl),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["annix-orbit", "job-distribution", variables.id],
      });
    },
  });
}

export function useOrbitAssistedPostingPack(jobPostingId: number | null) {
  return useQuery<AssistedPostingPackEntry[]>({
    queryKey: ["annix-orbit", "assisted-posting-pack", jobPostingId ?? 0],
    queryFn: () => annixOrbitApiClient.assistedPostingPack(jobPostingId as number),
    enabled: jobPostingId !== null && jobPostingId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitJobPostings(status?: string) {
  return useQuery<JobPosting[]>({
    queryKey: annixOrbitKeys.jobPostings.list(status),
    queryFn: () => annixOrbitApiClient.jobPostings(status),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<JobPosting>) => annixOrbitApiClient.createJobPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitUpdateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JobPosting> }) =>
      annixOrbitApiClient.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteJobPosting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitJobPostingStatusChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "activate" | "pause" | "close" }) => {
      if (action === "activate") {
        return annixOrbitApiClient.activateJobPosting(id);
      } else if (action === "pause") {
        return annixOrbitApiClient.pauseJobPosting(id);
      } else {
        return annixOrbitApiClient.closeJobPosting(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

// Phase 1 wizard hooks
export function useOrbitCreateJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, void>({
    mutationFn: () => annixOrbitApiClient.createJobDraft(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitJobWizardDraft(id: number | null) {
  return useQuery<JobPosting>({
    queryKey: annixOrbitKeys.jobPostings.wizard(id ?? 0),
    queryFn: () => annixOrbitApiClient.jobWizardDraft(id as number),
    enabled: id != null && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useOrbitUpdateJobWizard() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, { id: number; payload: UpdateJobWizardPayload }>({
    mutationFn: ({ id, payload }) => annixOrbitApiClient.updateJobWizard(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitPublishJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, { id: number; testMode?: boolean }>({
    mutationFn: ({ id, testMode }) => annixOrbitApiClient.publishJobDraft(id, { testMode }),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useOrbitSeedTestCandidates() {
  const queryClient = useQueryClient();
  return useMutation<
    { created: number; byProfile: Record<string, number> },
    Error,
    { id: number; count: number }
  >({
    mutationFn: ({ id, count }) => annixOrbitApiClient.seedTestCandidates(id, count),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.jobPostings.wizard(variables.id),
      });
    },
  });
}

export function useOrbitClearTestCandidates() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, Error, number>({
    mutationFn: (id) => annixOrbitApiClient.clearTestCandidates(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
    },
  });
}

// Phase 2 Nix hooks
export function useOrbitNixTitleSuggestions() {
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title?: string }) =>
      annixOrbitApiClient.nixTitleSuggestions(id, title),
  });
}

export function useOrbitNixDescription() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixDescription(id),
  });
}

export function useOrbitNixSkillSuggestions() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSkillSuggestions(id),
  });
}

export function useOrbitNixQualityScore() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixQualityScore(id),
  });
}

export function useOrbitNixScreeningSuggestions() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixScreeningQuestionsSuggest(id),
  });
}

export function useOrbitNixSalaryGuidance() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSalaryGuidance(id),
  });
}

export function useOrbitSalaryInsights(params: {
  normalizedTitle: string | null | undefined;
  province?: string | null;
}) {
  const titleParam = params.normalizedTitle;
  const provinceParam = params.province;
  const titleKey = titleParam ? titleParam : "";
  const provinceKey = provinceParam ? provinceParam : "";
  const enabled = Boolean(titleParam && titleParam.length > 0);
  return useQuery({
    queryKey: ["annix-orbit", "salary-insights", titleKey, provinceKey] as const,
    queryFn: () =>
      annixOrbitApiClient.salaryInsights({
        normalizedTitle: titleParam as string,
        province: provinceParam ? provinceParam : null,
      }),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

export function useOrbitNixSourcingQueries() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSourcingQueries(id),
  });
}
