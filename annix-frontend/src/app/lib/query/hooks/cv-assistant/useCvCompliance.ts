import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type EeReportResponse,
  type MySeekerEeAttributes,
  type UpdateMyEeAttributesInput,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useEeReport(dateFrom: string | null, dateTo: string | null) {
  return useQuery<EeReportResponse | null>({
    queryKey: cvAssistantKeys.compliance.eeReport(dateFrom ?? "", dateTo ?? ""),
    queryFn: () => {
      if (!dateFrom || !dateTo) return Promise.resolve(null);
      return cvAssistantApiClient.complianceEeReport(dateFrom, dateTo).catch(() => null);
    },
    enabled: Boolean(dateFrom && dateTo),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyEeAttributes() {
  return useQuery<MySeekerEeAttributes | null>({
    queryKey: cvAssistantKeys.individualProfile.eeAttributes(),
    queryFn: () => cvAssistantApiClient.myEeAttributes().catch(() => null),
    staleTime: 60 * 1000,
  });
}

export function useUpdateMyEeAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyEeAttributesInput) =>
      cvAssistantApiClient.updateMyEeAttributes(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: cvAssistantKeys.individualProfile.eeAttributes(),
      }),
  });
}

export function useDeleteMyEeAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cvAssistantApiClient.deleteMyEeAttributes(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: cvAssistantKeys.individualProfile.eeAttributes(),
      }),
  });
}
