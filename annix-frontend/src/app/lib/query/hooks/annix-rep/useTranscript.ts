import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTranscriptDto } from "@/app/lib/api/annixRepApi";
import { annixRepApi } from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useTranscript(recordingId: number) {
  return useQuery({
    queryKey: annixRepKeys.transcripts.byRecording(recordingId),
    queryFn: () => annixRepApi.transcripts.byRecording(recordingId),
    enabled: recordingId > 0,
  });
}

export function useMeetingTranscript(meetingId: number) {
  return useQuery({
    queryKey: annixRepKeys.transcripts.byMeeting(meetingId),
    queryFn: () => annixRepApi.transcripts.byMeeting(meetingId),
    enabled: meetingId > 0,
  });
}

export function useTranscribeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => annixRepApi.transcripts.transcribe(recordingId),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        annixRepKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.recordings.detail(transcript.recordingId),
      });
    },
  });
}

export function useRetranscribeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => annixRepApi.transcripts.retranscribe(recordingId),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        annixRepKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.recordings.detail(transcript.recordingId),
      });
    },
  });
}

export function useDeleteTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordingId: number) => annixRepApi.transcripts.delete(recordingId),
    onSuccess: (_, recordingId) => {
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.transcripts.byRecording(recordingId),
      });
    },
  });
}

export function useUpdateTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transcriptId, dto }: { transcriptId: number; dto: UpdateTranscriptDto }) =>
      annixRepApi.transcripts.update(transcriptId, dto),
    onSuccess: (transcript) => {
      queryClient.setQueryData(
        annixRepKeys.transcripts.byRecording(transcript.recordingId),
        transcript,
      );
      queryClient.invalidateQueries({
        queryKey: annixRepKeys.transcripts.all,
      });
    },
  });
}
