import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type IndividualDocument,
  type IndividualDocumentKind,
  type IndividualNotificationPreferences,
  type IndividualProfileStatus,
  type NixGeneratedCv,
  type NixGeneratedCvResponse,
  type NixSeekerCvAssessment,
} from "@/app/lib/api/cvAssistantApi";
import { nowISO } from "@/app/lib/datetime";
import { cvAssistantKeys } from "../../keys";

export function useCvMyProfileStatus(enabled = true) {
  return useQuery<IndividualProfileStatus>({
    queryKey: cvAssistantKeys.individualProfile.status(),
    queryFn: () => cvAssistantApiClient.myProfileStatus(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCvMyDocuments(enabled = true) {
  return useQuery<IndividualDocument[]>({
    queryKey: cvAssistantKeys.individualProfile.documents(),
    queryFn: () => cvAssistantApiClient.myDocuments(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCvUploadMyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      kind,
      label,
    }: {
      file: File;
      kind: IndividualDocumentKind;
      label?: string | null;
    }) => cvAssistantApiClient.uploadMyDocument(file, kind, label ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.individualProfile.all });
    },
  });
}

export function useCvDeleteMyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cvAssistantApiClient.deleteMyDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.individualProfile.all });
    },
  });
}

export function useCvMyNotificationPreferences(enabled = true) {
  return useQuery<IndividualNotificationPreferences>({
    queryKey: cvAssistantKeys.individualProfile.notificationPreferences(),
    queryFn: () => cvAssistantApiClient.myNotificationPreferences(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCvUpdateMyNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Partial<IndividualNotificationPreferences>) =>
      cvAssistantApiClient.updateMyNotificationPreferences(body),
    onSuccess: (data) => {
      queryClient.setQueryData(cvAssistantKeys.individualProfile.notificationPreferences(), data);
    },
  });
}

export function useCvRequestMyAccountDeletion() {
  return useMutation({
    mutationFn: () => cvAssistantApiClient.requestMyAccountDeletion(),
  });
}

export function useCvConfirmMyAccountDeletion() {
  return useMutation({
    mutationFn: (token: string) => cvAssistantApiClient.confirmMyAccountDeletion(token),
  });
}

export function useCvWithdrawMyConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cvAssistantApiClient.withdrawMyConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.individualProfile.all });
    },
  });
}

export function useCvNixWizardImprovements() {
  return useMutation<NixSeekerCvAssessment>({
    mutationFn: () => cvAssistantApiClient.nixWizardCvImprovements(),
  });
}

export function useNixGeneratedCv(enabled = true) {
  return useQuery<NixGeneratedCvResponse>({
    queryKey: cvAssistantKeys.individualProfile.nixGeneratedCv(),
    queryFn: () => cvAssistantApiClient.nixWizardGeneratedCv(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGenerateNixCv() {
  const queryClient = useQueryClient();

  return useMutation<NixGeneratedCv>({
    mutationFn: () => cvAssistantApiClient.nixWizardGenerateCv(),
    onSuccess: (data) => {
      queryClient.setQueryData<NixGeneratedCvResponse>(
        cvAssistantKeys.individualProfile.nixGeneratedCv(),
        { cv: data, generatedAt: nowISO() },
      );
      queryClient.invalidateQueries({
        queryKey: cvAssistantKeys.individualProfile.nixGeneratedCv(),
      });
    },
  });
}
