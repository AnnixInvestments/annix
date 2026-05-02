import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type IndividualDocument,
  type IndividualDocumentKind,
  type IndividualProfileStatus,
} from "@/app/lib/api/cvAssistantApi";
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
