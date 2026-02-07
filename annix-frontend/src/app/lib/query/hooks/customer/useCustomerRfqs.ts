import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { draftsApi, type RfqResponse, rfqApi } from "@/app/lib/api/client";
import { customerKeys } from "../../keys";

export function useCustomerRfqs() {
  return useQuery<RfqResponse[]>({
    queryKey: customerKeys.rfqs.list(),
    queryFn: () => rfqApi.getAll(),
  });
}

export function useCustomerRfqDetail(id: number) {
  return useQuery({
    queryKey: customerKeys.rfqs.detail(id),
    queryFn: () => rfqApi.getById(id),
    enabled: id > 0,
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: number) => draftsApi.delete(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.drafts.all });
    },
  });
}
