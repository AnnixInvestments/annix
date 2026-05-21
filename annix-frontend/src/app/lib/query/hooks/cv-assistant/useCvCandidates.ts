import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type Candidate,
  type CandidateJobMatch,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys, type CvCandidateQueryParams } from "../../keys";

export function useCvCandidates(params?: CvCandidateQueryParams) {
  return useQuery<Candidate[]>({
    queryKey: annixOrbitKeys.candidates.list(params),
    queryFn: () => {
      const rawStatus = params?.status;
      const rawJobPostingId = params?.jobPostingId;

      return annixOrbitApiClient.candidates({
        status: rawStatus || undefined,
        jobPostingId: rawJobPostingId || undefined,
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvRecommendedJobs(candidateId: number | null) {
  return useQuery<CandidateJobMatch[]>({
    queryKey: annixOrbitKeys.candidates.recommendedJobs(candidateId!),
    queryFn: () => annixOrbitApiClient.recommendedJobsForCandidate(candidateId!),
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
        return annixOrbitApiClient.rejectCandidate(id);
      } else if (action === "shortlist") {
        return annixOrbitApiClient.shortlistCandidate(id);
      } else {
        return annixOrbitApiClient.acceptCandidate(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.dashboard.all });
    },
  });
}

export function useCvCandidateStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string | null }) =>
      annixOrbitApiClient.updateCandidateStatus(id, {
        status,
        reason: reason ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.dashboard.all });
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
    }) => annixOrbitApiClient.uploadCv(file, jobPostingId, email ?? undefined, name ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.dashboard.all });
    },
  });
}

export function useCvDismissMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: number) => annixOrbitApiClient.dismissMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
    },
  });
}
