import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type Candidate,
  type CandidateJobMatch,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys, type CvCandidateQueryParams } from "../../keys";

export function useOrbitCandidates(params?: CvCandidateQueryParams) {
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

export function useOrbitRecommendedJobs(candidateId: number | null) {
  return useQuery<CandidateJobMatch[]>({
    queryKey: annixOrbitKeys.candidates.recommendedJobs(candidateId!),
    queryFn: () => annixOrbitApiClient.recommendedJobsForCandidate(candidateId!),
    enabled: candidateId !== null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCandidatePhotoUrl(candidateId: number | null) {
  return useQuery<{ photoUrl: string | null }>({
    queryKey: annixOrbitKeys.candidates.photoUrl(candidateId ?? 0),
    queryFn: () => annixOrbitApiClient.candidatePhotoUrl(candidateId!),
    enabled: candidateId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitCandidateAction() {
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

export function useOrbitCandidateStatusUpdate() {
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

export function useOrbitUploadCv() {
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

export function useOrbitDismissMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: number) => annixOrbitApiClient.dismissMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.candidates.all });
    },
  });
}
