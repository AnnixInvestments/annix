import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type SeekerRecommendedJobsResponse,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvSeekerRecommendedJobs(enabled: boolean = true) {
  return useQuery<SeekerRecommendedJobsResponse>({
    queryKey: cvAssistantKeys.seekerJobs.recommended(),
    queryFn: () => cvAssistantApiClient.seekerRecommendedJobs(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvDismissSeekerMatch() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (matchId) => cvAssistantApiClient.dismissSeekerMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerJobs.all });
    },
  });
}
