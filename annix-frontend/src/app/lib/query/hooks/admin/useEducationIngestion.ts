import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdmissionDraft,
  type AdmissionDraftStatus,
  educationIngestionAdminApi,
  type IngestPayload,
} from "@/app/lib/api/educationIngestionAdminApi";

const educationIngestionKeys = {
  all: ["orbit-education-ingestion"] as const,
  drafts: (programmeId?: string, status?: AdmissionDraftStatus) =>
    ["orbit-education-ingestion", "drafts", programmeId ?? "all", status ?? "all"] as const,
};

export function useEducationDrafts(params: {
  programmeId?: string;
  status?: AdmissionDraftStatus;
}) {
  return useQuery<AdmissionDraft[]>({
    queryKey: educationIngestionKeys.drafts(params.programmeId, params.status),
    queryFn: () => educationIngestionAdminApi.listDrafts(params),
  });
}

export function useIngestAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngestPayload) => educationIngestionAdminApi.ingest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationIngestionKeys.all });
    },
  });
}

export function useApproveDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => educationIngestionAdminApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationIngestionKeys.all });
    },
  });
}

export function useCorrectDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: Record<string, unknown> }) =>
      educationIngestionAdminApi.correct(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationIngestionKeys.all });
    },
  });
}

export function useRejectDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => educationIngestionAdminApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationIngestionKeys.all });
    },
  });
}
