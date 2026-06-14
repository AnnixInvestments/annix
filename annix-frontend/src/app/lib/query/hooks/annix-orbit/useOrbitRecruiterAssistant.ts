import { useMutation } from "@tanstack/react-query";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";

// AI calls are on-demand (and metered), so these are mutations the UI
// fires explicitly — wrapped by the caller in the extraction-progress
// popup for the >3s latency (issue #362 phase 5).
export function useOrbitRecruiterFindCandidates() {
  return useMutation({
    mutationFn: (query: string) => annixOrbitApiClient.recruiterFindCandidates(query),
  });
}

export function useOrbitCandidateComplianceGap() {
  return useMutation({
    mutationFn: (candidateId: number) => annixOrbitApiClient.candidateComplianceGap(candidateId),
  });
}
