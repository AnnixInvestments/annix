import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTranscriptDto } from "@/app/lib/api/fieldflowApi";
import { fieldflowApi } from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useTranscript(recordingId: number) {
  return useQuery({
    queryKey: fieldflowKeys.transcripts.byRecording(recordingId),
    queryFn: () => fieldflowApi.transcripts.byRecording(recordingId),
    enabled: recordingId > 0,
  });
}

export function useMeetingTranscript(meetingId: number) {
  return useQuery({
    queryKey: fieldflowKeys.transcripts.byMeeting(meetingId),
    queryFn: () => fieldflowApi.transcripts.byMeeting(meetingId),
    enabled: meetingId > 0,
  });
}

export function useTranscribeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => fieldflowApi.transcripts.transcribe(recordingId),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        fieldflowKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.recordings.detail(transcript.recordingId),
      });
    },
  });
}

export function useRetranscribeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => fieldflowApi.transcripts.retranscribe(recordingId),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        fieldflowKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.recordings.detail(transcript.recordingId),
      });
    },
  });
}

export function useDeleteTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => fieldflowApi.transcripts.delete(recordingId),
    onSuccess: (_, recordingId) => {
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.transcripts.byRecording(recordingId),
      });
    },
  });
}

export function useUpdateTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transcriptId, dto }: { transcriptId: number; dto: UpdateTranscriptDto }) =>
      fieldflowApi.transcripts.update(transcriptId, dto),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        fieldflowKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: fieldflowKeys.transcripts.all,
      });
    },
  });
}
