import { useQuery } from "@tanstack/react-query";
import { cvAssistantApiClient, type EeReportResponse } from "@/app/lib/api/cvAssistantApi";
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
