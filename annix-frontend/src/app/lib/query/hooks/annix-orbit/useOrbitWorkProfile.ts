import type { WorkProfile } from "@annix/product-data/sa-market";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

interface WorkProfileResponse {
  profile: WorkProfile;
  candidateIds: number[];
  suggestedSalaryMin: number | null;
  suggestedSalaryMax: number | null;
}

export function useOrbitSeekerWorkProfile(enabled: boolean = true) {
  return useQuery<WorkProfileResponse>({
    queryKey: annixOrbitKeys.seekerWorkProfile.detail(),
    queryFn: () => annixOrbitApiClient.seekerWorkProfile(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitUpsertSeekerWorkProfile() {
  const queryClient = useQueryClient();
  return useMutation<{ saved: boolean; candidateIds: number[] }, Error, WorkProfile>({
    mutationFn: (profile) => annixOrbitApiClient.upsertSeekerWorkProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerWorkProfile.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}

interface AutofillResponse {
  extracted: boolean;
  profile: WorkProfile;
  candidateIds: number[];
  reason?: "no-candidate" | "no-cv-text" | "ai-failed";
}

export function useOrbitAutofillSeekerWorkProfile() {
  const queryClient = useQueryClient();
  return useMutation<AutofillResponse, Error, void>({
    mutationFn: () => annixOrbitApiClient.autofillSeekerWorkProfileFromCv(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerWorkProfile.all });
    },
  });
}
