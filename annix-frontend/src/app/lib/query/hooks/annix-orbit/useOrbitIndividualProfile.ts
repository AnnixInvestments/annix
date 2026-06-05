import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CredentialFields,
  type IndividualDataExport,
  type IndividualDocument,
  type IndividualDocumentKind,
  type IndividualNotificationPreferences,
  type IndividualProfileStatus,
  type NixGeneratedCv,
  type NixGeneratedCvResponse,
  type NixSeekerCvAssessment,
} from "@/app/lib/api/annixOrbitApi";
import { nowISO } from "@/app/lib/datetime";
import { annixOrbitKeys } from "../../keys";

export function useOrbitMyProfileStatus(enabled = true) {
  return useQuery<IndividualProfileStatus>({
    queryKey: annixOrbitKeys.individualProfile.status(),
    queryFn: () => annixOrbitApiClient.myProfileStatus(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitAcknowledgeDismissWarning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => annixOrbitApiClient.acknowledgeDismissWarning(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.status() });
    },
  });
}

export function useOrbitCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => annixOrbitApiClient.completeOnboarding(),
    onSuccess: () => {
      queryClient.setQueryData<IndividualProfileStatus>(
        annixOrbitKeys.individualProfile.status(),
        (old) => (old ? { ...old, onboardingComplete: true } : old),
      );
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.status() });
    },
  });
}

export function useOrbitSendAppLink() {
  return useMutation({
    mutationFn: () => annixOrbitApiClient.sendAppLink(),
  });
}

export function useOrbitMyDocuments(enabled = true) {
  return useQuery<IndividualDocument[]>({
    queryKey: annixOrbitKeys.individualProfile.documents(),
    queryFn: () => annixOrbitApiClient.myDocuments(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitUploadMyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      kind,
      label,
      onProgress,
    }: {
      file: File;
      kind: IndividualDocumentKind;
      label?: string | null;
      onProgress?: (fraction: number) => void;
    }) => annixOrbitApiClient.uploadMyDocument(file, kind, label ?? null, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitUploadMyDocumentPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      kind,
      onProgress,
    }: {
      file: File;
      kind: IndividualDocumentKind;
      onProgress?: (fraction: number) => void;
    }) => annixOrbitApiClient.uploadMyDocumentPhoto(file, kind, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitUpdateMyDocumentCredentialFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Partial<CredentialFields> }) =>
      annixOrbitApiClient.updateMyDocumentCredentialFields(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitDeleteMyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteMyDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitMyNotificationPreferences(enabled = true) {
  return useQuery<IndividualNotificationPreferences>({
    queryKey: annixOrbitKeys.individualProfile.notificationPreferences(),
    queryFn: () => annixOrbitApiClient.myNotificationPreferences(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitUpdateMyNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Partial<IndividualNotificationPreferences>) =>
      annixOrbitApiClient.updateMyNotificationPreferences(body),
    onSuccess: (data) => {
      queryClient.setQueryData(annixOrbitKeys.individualProfile.notificationPreferences(), data);
    },
  });
}

export function useOrbitRequestMyAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => annixOrbitApiClient.requestMyAccountDeletion(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitMyDataExport() {
  return useMutation<IndividualDataExport, unknown, void>({
    mutationFn: () => annixOrbitApiClient.myDataExport(),
  });
}

export function useOrbitConfirmMyAccountDeletion() {
  return useMutation({
    mutationFn: (token: string) => annixOrbitApiClient.confirmMyAccountDeletion(token),
  });
}

export function useOrbitWithdrawMyConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => annixOrbitApiClient.withdrawMyConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
    },
  });
}

export function useOrbitNixWizardImprovements() {
  return useMutation<NixSeekerCvAssessment>({
    mutationFn: () => annixOrbitApiClient.nixWizardCvImprovements(),
  });
}

export function useNixGeneratedCv(enabled = true) {
  return useQuery<NixGeneratedCvResponse>({
    queryKey: annixOrbitKeys.individualProfile.nixGeneratedCv(),
    queryFn: () => annixOrbitApiClient.nixWizardGeneratedCv(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGenerateNixCv() {
  const queryClient = useQueryClient();

  return useMutation<NixGeneratedCv>({
    mutationFn: () => annixOrbitApiClient.nixWizardGenerateCv(),
    onSuccess: (data) => {
      queryClient.setQueryData<NixGeneratedCvResponse>(
        annixOrbitKeys.individualProfile.nixGeneratedCv(),
        { cv: data, generatedAt: nowISO() },
      );
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.individualProfile.nixGeneratedCv(),
      });
    },
  });
}

export function useUpdateNixGeneratedCv() {
  const queryClient = useQueryClient();

  return useMutation<NixGeneratedCv, Error, NixGeneratedCv>({
    mutationFn: (cv: NixGeneratedCv) => annixOrbitApiClient.nixWizardUpdateGeneratedCv(cv),
    onSuccess: (data) => {
      queryClient.setQueryData<NixGeneratedCvResponse>(
        annixOrbitKeys.individualProfile.nixGeneratedCv(),
        { cv: data, generatedAt: nowISO() },
      );
    },
  });
}

export function useAdoptNixCv() {
  const queryClient = useQueryClient();

  return useMutation<{ candidateId: number | null }, Error, void>({
    mutationFn: () => annixOrbitApiClient.nixWizardAdoptCv(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.individualProfile.all });
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerJobs.all });
    },
  });
}
