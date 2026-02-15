import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fieldflowApi, type SendSummaryDto } from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useSummaryPreview(meetingId: number) {
  return useQuery({
    queryKey: fieldflowKeys.summaries.preview(meetingId),
    queryFn: () => fieldflowApi.summaries.preview(meetingId),
    enabled: meetingId > 0,
  });
}

export function useSendSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, dto }: { meetingId: number; dto: SendSummaryDto }) =>
      fieldflowApi.summaries.send(meetingId, dto),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.meetings.detail(meetingId) });
    },
  });
}
