import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CompleteUploadDto,
  fieldflowApi,
  type InitiateUploadDto,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useRecording(recordingId: number) {
  return useQuery({
    queryKey: fieldflowKeys.recordings.detail(recordingId),
    queryFn: () => fieldflowApi.recordings.detail(recordingId),
    enabled: recordingId > 0,
  });
}

export function useMeetingRecording(meetingId: number) {
  return useQuery({
    queryKey: fieldflowKeys.recordings.byMeeting(meetingId),
    queryFn: () => fieldflowApi.recordings.byMeeting(meetingId),
    enabled: meetingId > 0,
  });
}

export function useInitiateRecordingUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: InitiateUploadDto) => fieldflowApi.recordings.initiate(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.recordings.byMeeting(dto.meetingId),
      });
    },
  });
}

export function useUploadRecordingChunk() {
  return useMutation({
    mutationFn: ({
      recordingId,
      chunkIndex,
      data,
    }: {
      recordingId: number;
      chunkIndex: number;
      data: Blob;
    }) => fieldflowApi.recordings.uploadChunk(recordingId, chunkIndex, data),
  });
}

export function useCompleteRecordingUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordingId, dto }: { recordingId: number; dto: CompleteUploadDto }) =>
      fieldflowApi.recordings.complete(recordingId, dto),
    onSuccess: (recording) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.recordings.detail(recording.id) });
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.recordings.byMeeting(recording.meetingId),
      });
    },
  });
}

export function useUpdateSpeakerLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordingId,
      speakerLabels,
    }: {
      recordingId: number;
      speakerLabels: Record<string, string>;
    }) => fieldflowApi.recordings.updateSpeakerLabels(recordingId, speakerLabels),
    onSuccess: (recording) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.recordings.detail(recording.id) });
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.recordings.byMeeting(recording.meetingId),
      });
    },
  });
}

export function useDeleteRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => fieldflowApi.recordings.delete(recordingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.recordings.all });
    },
  });
}
