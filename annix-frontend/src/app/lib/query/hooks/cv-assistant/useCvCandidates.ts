import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Candidate,
  type CandidateJobMatch,
  cvAssistantApiClient,
} from "@/app/lib/api/cvAssistantApi";
import { type CvCandidateQueryParams, cvAssistantKeys } from "../../keys";

export function useCvCandidates(params?: CvCandidateQueryParams) {
  return useQuery<Candidate[]>({
    queryKey: cvAssistantKeys.candidates.list(params),
    queryFn: () => {
      const rawStatus = params?.status;
      const rawJobPostingId = params?.jobPostingId;

      return cvAssistantApiClient.candidates({
        status: rawStatus || undefined,
        jobPostingId: rawJobPostingId || undefined,
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvRecommendedJobs(candidateId: number | null) {
  return useQuery<CandidateJobMatch[]>({
    queryKey: cvAssistantKeys.candidates.recommendedJobs(candidateId!),
    queryFn: () => cvAssistantApiClient.recommendedJobsForCandidate(candidateId!),
    enabled: candidateId !== null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvCandidateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: number;
      action: "reject" | "shortlist" | "accept";
    }) => {
      if (action === "reject") {
        return cvAssistantApiClient.rejectCandidate(id);
      } else if (action === "shortlist") {
        return cvAssistantApiClient.shortlistCandidate(id);
      } else {
        return cvAssistantApiClient.acceptCandidate(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.candidates.all });
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.dashboard.all });
    },
  });
}

export function useCvUploadCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      jobPostingId,
      email,
      name,
    }: {
      file: File;
      jobPostingId: number;
      email?: string | null;
      name?: string | null;
    }) => cvAssistantApiClient.uploadCv(file, jobPostingId, email ?? undefined, name ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.candidates.all });
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.dashboard.all });
    },
  });
}

export function useCvDismissMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: number) => cvAssistantApiClient.dismissMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.candidates.all });
    },
  });
}
