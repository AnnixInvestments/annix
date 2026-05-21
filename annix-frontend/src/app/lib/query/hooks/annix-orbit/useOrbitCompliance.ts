import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type EeReportResponse,
  type MySeekerEeAttributes,
  type UpdateMyEeAttributesInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useEeReport(dateFrom: string | null, dateTo: string | null) {
  return useQuery<EeReportResponse | null>({
    queryKey: annixOrbitKeys.compliance.eeReport(dateFrom ?? "", dateTo ?? ""),
    queryFn: () => {
      if (!dateFrom || !dateTo) return Promise.resolve(null);
      return annixOrbitApiClient.complianceEeReport(dateFrom, dateTo).catch(() => null);
    },
    enabled: Boolean(dateFrom && dateTo),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyEeAttributes() {
  return useQuery<MySeekerEeAttributes | null>({
    queryKey: annixOrbitKeys.individualProfile.eeAttributes(),
    queryFn: () => annixOrbitApiClient.myEeAttributes().catch(() => null),
    staleTime: 60 * 1000,
  });
}

export function useUpdateMyEeAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyEeAttributesInput) =>
      annixOrbitApiClient.updateMyEeAttributes(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.individualProfile.eeAttributes(),
      }),
  });
}

export function useDeleteMyEeAttributes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => annixOrbitApiClient.deleteMyEeAttributes(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: annixOrbitKeys.individualProfile.eeAttributes(),
      }),
  });
}
