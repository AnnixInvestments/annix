import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cvAssistantApiClient, type JobPosting } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

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
