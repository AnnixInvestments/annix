import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type CompleteUploadDto,
  type InitiateUploadDto,
} from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useRecording(recordingId: number) {
  return useQuery({
    queryKey: annixRepKeys.recordings.detail(recordingId),
    queryFn: () => annixRepApi.recordings.detail(recordingId),
    enabled: recordingId > 0,
  });
}

export function useMeetingRecording(meetingId: number) {
  return useQuery({
    queryKey: annixRepKeys.recordings.byMeeting(meetingId),
    queryFn: () => annixRepApi.recordings.byMeeting(meetingId),
    enabled: meetingId > 0,
  });
}

export function useInitiateRecordingUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: InitiateUploadDto) => annixRepApi.recordings.initiate(dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.recordings.byMeeting(dto.meetingId),
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
    }) => annixRepApi.recordings.uploadChunk(recordingId, chunkIndex, data),
  });
}

export function useCompleteRecordingUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordingId, dto }: { recordingId: number; dto: CompleteUploadDto }) =>
      annixRepApi.recordings.complete(recordingId, dto),
    onSuccess: (recording) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.recordings.detail(recording.id) });
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.recordings.byMeeting(recording.meetingId),
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
    }) => annixRepApi.recordings.updateSpeakerLabels(recordingId, speakerLabels),
    onSuccess: (recording) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.recordings.detail(recording.id) });
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.recordings.byMeeting(recording.meetingId),
      });
    },
  });
}

export function useDeleteRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => annixRepApi.recordings.delete(recordingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.recordings.all });
    },
  });
}
