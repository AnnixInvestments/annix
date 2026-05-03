import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type JobPosting,
  type PortalAdapterSummary,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvPortalAdapters() {
  return useQuery<PortalAdapterSummary[]>({
    queryKey: ["cv-assistant", "portal-adapters"],
    queryFn: () => cvAssistantApiClient.portalAdapters(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useCvJobPostings(status?: string) {
  return useQuery<JobPosting[]>({
    queryKey: cvAssistantKeys.jobPostings.list(status),
    queryFn: () => cvAssistantApiClient.jobPostings(status),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<JobPosting>) => cvAssistantApiClient.createJobPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

export function useCvUpdateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<JobPosting> }) =>
      cvAssistantApiClient.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

export function useCvDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.deleteJobPosting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

export function useCvJobPostingStatusChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "activate" | "pause" | "close" }) => {
      if (action === "activate") {
        return cvAssistantApiClient.activateJobPosting(id);
      } else if (action === "pause") {
        return cvAssistantApiClient.pauseJobPosting(id);
      } else {
        return cvAssistantApiClient.closeJobPosting(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

// Phase 1 wizard hooks
export function useCvCreateJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, void>({
    mutationFn: () => cvAssistantApiClient.createJobDraft(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

export function useCvJobWizardDraft(id: number | null) {
  return useQuery<JobPosting>({
    queryKey: cvAssistantKeys.jobPostings.wizard(id ?? 0),
    queryFn: () => cvAssistantApiClient.jobWizardDraft(id as number),
    enabled: id != null && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useCvUpdateJobWizard() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, { id: number; payload: UpdateJobWizardPayload }>({
    mutationFn: ({ id, payload }) => cvAssistantApiClient.updateJobWizard(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(cvAssistantKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

export function useCvPublishJobDraft() {
  const queryClient = useQueryClient();

  return useMutation<JobPosting, Error, number>({
    mutationFn: (id) => cvAssistantApiClient.publishJobDraft(id),
    onSuccess: (data) => {
      queryClient.setQueryData(cvAssistantKeys.jobPostings.wizard(data.id), data);
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.jobPostings.all });
    },
  });
}

// Phase 2 Nix hooks
export function useCvNixTitleSuggestions() {
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title?: string }) =>
      cvAssistantApiClient.nixTitleSuggestions(id, title),
  });
}

export function useCvNixDescription() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixDescription(id),
  });
}

export function useCvNixSkillSuggestions() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixSkillSuggestions(id),
  });
}

export function useCvNixQualityScore() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixQualityScore(id),
  });
}

export function useCvNixScreeningSuggestions() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixScreeningQuestionsSuggest(id),
  });
}

export function useCvNixSalaryGuidance() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixSalaryGuidance(id),
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
      cvAssistantApiClient.salaryInsights({
        normalizedTitle: titleParam as string,
        province: provinceParam ? provinceParam : null,
      }),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCvNixSourcingQueries() {
  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.nixSourcingQueries(id),
  });
}
