import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type SeekerEducationConsent,
  type SeekerEducationGuardianLink,
  type SeekerEducationInput,
  type SeekerEducationMentorAnswer,
  type SeekerEducationProfile,
  type SeekerEducationRecommendationsResponse,
  type SeekerEducationResponse,
  type SeekerEducationResult,
  type SeekerEducationResultInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSeekerEducation(enabled: boolean = true) {
  return useQuery<SeekerEducationResponse>({
    queryKey: annixOrbitKeys.seekerEducation.detail(),
    queryFn: () => annixOrbitApiClient.seekerEducation(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitUpsertSeekerEducation() {
  const queryClient = useQueryClient();
  return useMutation<{ profile: SeekerEducationProfile }, Error, SeekerEducationInput>({
    mutationFn: (input) => annixOrbitApiClient.upsertSeekerEducation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.all });
    },
  });
}

export function useOrbitAddSeekerEducationResult() {
  const queryClient = useQueryClient();
  return useMutation<{ result: SeekerEducationResult }, Error, SeekerEducationResultInput>({
    mutationFn: (input) => annixOrbitApiClient.addSeekerEducationResult(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.all });
    },
  });
}

export function useOrbitDeleteSeekerEducationResult() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (id) => annixOrbitApiClient.deleteSeekerEducationResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.all });
    },
  });
}

export function useOrbitRecordSeekerEducationConsent() {
  const queryClient = useQueryClient();
  return useMutation<{ consent: SeekerEducationConsent }, Error, void>({
    mutationFn: () => annixOrbitApiClient.recordSeekerEducationConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.all });
    },
  });
}

export function useOrbitInviteSeekerEducationGuardian() {
  const queryClient = useQueryClient();
  return useMutation<{ guardianLink: SeekerEducationGuardianLink }, Error, string>({
    mutationFn: (guardianEmail) => annixOrbitApiClient.inviteSeekerEducationGuardian(guardianEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.all });
    },
  });
}

export function useOrbitAskSeekerEducationMentor() {
  return useMutation<SeekerEducationMentorAnswer, Error, string>({
    mutationFn: (question) => annixOrbitApiClient.askSeekerEducationMentor(question),
  });
}

export function useOrbitSeekerEducationRecommendations(
  intakeYear?: number,
  enabled: boolean = true,
) {
  return useQuery<SeekerEducationRecommendationsResponse>({
    queryKey: annixOrbitKeys.seekerEducation.recommendations(intakeYear),
    queryFn: () => annixOrbitApiClient.seekerEducationRecommendations(intakeYear),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
