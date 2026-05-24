import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type GuardianLinkedStudent,
  type SeekerEducationApplication,
  type SeekerEducationApplicationInput,
  type SeekerEducationApplicationStatus,
  type SeekerEducationCareerFit,
  type SeekerEducationCompareOptionsResponse,
  type SeekerEducationConsent,
  type SeekerEducationGuardianLink,
  type SeekerEducationInput,
  type SeekerEducationMentorAnswer,
  type SeekerEducationProfile,
  type SeekerEducationRecommendationsResponse,
  type SeekerEducationResponse,
  type SeekerEducationResult,
  type SeekerEducationResultInput,
  type SeekerEducationScholarship,
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

export function useOrbitSeekerEducationCompareOptions(
  intakeYear?: number,
  enabled: boolean = true,
) {
  return useQuery<SeekerEducationCompareOptionsResponse>({
    queryKey: annixOrbitKeys.seekerEducation.compareOptions(intakeYear),
    queryFn: () => annixOrbitApiClient.seekerEducationCompareOptions(intakeYear),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitSeekerEducationApplications(enabled: boolean = true) {
  return useQuery<{ applications: SeekerEducationApplication[] }>({
    queryKey: annixOrbitKeys.seekerEducation.applications(),
    queryFn: () => annixOrbitApiClient.seekerEducationApplications(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitCreateSeekerEducationApplication() {
  const queryClient = useQueryClient();
  return useMutation<
    { application: SeekerEducationApplication },
    Error,
    SeekerEducationApplicationInput
  >({
    mutationFn: (input) => annixOrbitApiClient.createSeekerEducationApplication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.applications() });
    },
  });
}

export function useOrbitUpdateSeekerEducationApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    { application: SeekerEducationApplication },
    Error,
    { id: string; status: SeekerEducationApplicationStatus }
  >({
    mutationFn: ({ id, status }) =>
      annixOrbitApiClient.updateSeekerEducationApplicationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.applications() });
    },
  });
}

export function useOrbitDeleteSeekerEducationApplication() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (id) => annixOrbitApiClient.deleteSeekerEducationApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEducation.applications() });
    },
  });
}

export function useOrbitSeekerEducationScholarships(enabled: boolean = true) {
  return useQuery<{ scholarships: SeekerEducationScholarship[] }>({
    queryKey: annixOrbitKeys.seekerEducation.scholarships(),
    queryFn: () => annixOrbitApiClient.seekerEducationScholarships(),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

export function useOrbitSeekerEducationCareerFit(enabled: boolean = true) {
  return useQuery<{ careerFit: SeekerEducationCareerFit[] }>({
    queryKey: annixOrbitKeys.seekerEducation.careerFit(),
    queryFn: () => annixOrbitApiClient.seekerEducationCareerFit(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitGuardianStudents(enabled: boolean = true) {
  return useQuery<{ students: GuardianLinkedStudent[] }>({
    queryKey: annixOrbitKeys.guardian.students(),
    queryFn: () => annixOrbitApiClient.guardianStudents(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitAcceptGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation<{ guardianLink: SeekerEducationGuardianLink }, Error, string>({
    mutationFn: (linkId) => annixOrbitApiClient.acceptGuardianLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.guardian.all });
    },
  });
}

export function useOrbitRecordGuardianConsent() {
  const queryClient = useQueryClient();
  return useMutation<{ recorded: boolean }, Error, string>({
    mutationFn: (linkId) => annixOrbitApiClient.recordGuardianConsent(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.guardian.all });
    },
  });
}
