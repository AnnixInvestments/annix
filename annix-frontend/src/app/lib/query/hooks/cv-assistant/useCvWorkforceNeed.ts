import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type WorkforceNeedInput,
  type WorkforceNeedSummary,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvWorkforceNeed(rfqId: number | null) {
  return useQuery<WorkforceNeedSummary>({
    queryKey: annixOrbitKeys.workforceNeed.forRfq(rfqId ?? -1),
    queryFn: () => annixOrbitApiClient.adminWorkforceNeedSummary(rfqId as number),
    enabled: rfqId !== null && rfqId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCvUpsertWorkforceNeed(rfqId: number) {
  const queryClient = useQueryClient();
  return useMutation<WorkforceNeedSummary, Error, WorkforceNeedInput>({
    mutationFn: (input) => annixOrbitApiClient.adminUpsertWorkforceNeed(rfqId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.workforceNeed.forRfq(rfqId) });
    },
  });
}
