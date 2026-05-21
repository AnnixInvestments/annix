import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AssistedPostingPackEntry,
  annixOrbitApiClient,
  type JobPosting,
  type PortalAdapterSummary,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvPortalAdapters() {
  return useQuery<PortalAdapterSummary[]>({
    queryKey: ["cv-assistant", "portal-adapters"],
    queryFn: () => annixOrbitApiClient.portalAdapters(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useCvAssistedPostingPack(jobPostingId: number | null) {
  return useQuery<AssistedPostingPackEntry[]>({
    queryKey: ["cv-assistant", "assisted-posting-pack", jobPostingId ?? 0],
    queryFn: () => annixOrbitApiClient.assistedPostingPack(jobPostingId as number),
    enabled: jobPostingId !== null && jobPostingId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvJobPostings(status?: string) {
  return useQuery<JobPosting[]>({
    queryKey: annixOrbitKeys.jobPostings.list(status),
    queryFn: () => annixOrbitApiClient.jobPostings(status),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<JobPosting>) => annixOrbitApiClient.createJobPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvUpdateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JobPosting> }) =>
      annixOrbitApiClient.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteJobPosting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvJobPostingStatusChange() {
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
export function useCvCreateJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, void>({
    mutationFn: () => annixOrbitApiClient.createJobDraft(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvJobWizardDraft(id: number | null) {
  return useQuery<JobPosting>({
    queryKey: annixOrbitKeys.jobPostings.wizard(id ?? 0),
    queryFn: () => annixOrbitApiClient.jobWizardDraft(id as number),
    enabled: id != null && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useCvUpdateJobWizard() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, { id: number; payload: UpdateJobWizardPayload }>({
    mutationFn: ({ id, payload }) => annixOrbitApiClient.updateJobWizard(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvPublishJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, { id: number; testMode?: boolean }>({
    mutationFn: ({ id, testMode }) => annixOrbitApiClient.publishJobDraft(id, { testMode }),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
    },
  });
}

export function useCvSeedTestCandidates() {
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

export function useCvClearTestCandidates() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, Error, number>({
    mutationFn: (id) => annixOrbitApiClient.clearTestCandidates(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
    },
  });
}

// Phase 2 Nix hooks
export function useCvNixTitleSuggestions() {
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title?: string }) =>
      annixOrbitApiClient.nixTitleSuggestions(id, title),
  });
}

export function useCvNixDescription() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixDescription(id),
  });
}

export function useCvNixSkillSuggestions() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSkillSuggestions(id),
  });
}

export function useCvNixQualityScore() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixQualityScore(id),
  });
}

export function useCvNixScreeningSuggestions() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixScreeningQuestionsSuggest(id),
  });
}

export function useCvNixSalaryGuidance() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSalaryGuidance(id),
  });
}

export function useCvSalaryInsights(params: {
  normalizedTitle: string | null | undefined;
  province?: string | null;
}) {
  const titleParam = params.normalizedTitle;
  const provinceParam = params.province;
  const titleKey = titleParam ? titleParam : "";
  const provinceKey = provinceParam ? provinceParam : "";
  const enabled = Boolean(titleParam && titleParam.length > 0);
  return useQuery({
    queryKey: ["cv-assistant", "salary-insights", titleKey, provinceKey] as const,
    queryFn: () =>
      annixOrbitApiClient.salaryInsights({
        normalizedTitle: titleParam as string,
        province: provinceParam ? provinceParam : null,
      }),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCvNixSourcingQueries() {
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.nixSourcingQueries(id),
  });
}
