import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type WorkforceNeedInput,
  type WorkforceNeedSummary,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvWorkforceNeed(rfqId: number | null) {
  return useQuery<WorkforceNeedSummary>({
    queryKey: cvAssistantKeys.workforceNeed.forRfq(rfqId ?? -1),
    queryFn: () => cvAssistantApiClient.adminWorkforceNeedSummary(rfqId as number),
    enabled: rfqId !== null && rfqId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvUpsertWorkforceNeed(rfqId: number) {
  const queryClient = useQueryClient();
  return useMutation<WorkforceNeedSummary, Error, WorkforceNeedInput>({
    mutationFn: (input) => cvAssistantApiClient.adminUpsertWorkforceNeed(rfqId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.workforceNeed.forRfq(rfqId) });
    },
  });
}
