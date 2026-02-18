import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixRepApi, type SendSummaryDto } from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useSummaryPreview(meetingId: number) {
  return useQuery({
    queryKey: annixRepKeys.summaries.preview(meetingId),
    queryFn: () => annixRepApi.summaries.preview(meetingId),
    enabled: meetingId > 0,
  });
}

export function useSendSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, dto }: { meetingId: number; dto: SendSummaryDto }) =>
      annixRepApi.summaries.send(meetingId, dto),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetings.detail(meetingId) });
    },
  });
}
