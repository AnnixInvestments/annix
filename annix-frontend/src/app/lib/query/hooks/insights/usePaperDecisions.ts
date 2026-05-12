import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  insightsApi,
  type PaperPortfolioSummary,
  type PortfolioDecisionsPreview,
} from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function usePaperDecisionsToday(slug: string | null) {
  return useQuery<PortfolioDecisionsPreview>({
    queryKey: insightsKeys.paperDecisionsToday(slug ?? ""),
    queryFn: () => {
      if (!slug) throw new Error("Slug required");
      return insightsApi.paperPortfolios.decisionsToday(slug);
    },
    enabled: slug !== null,
    staleTime: 60 * 1000,
  });
}

export function usePausePortfolio() {
  const qc = useQueryClient();
  return useMutation<PaperPortfolioSummary, Error, string>({
    mutationFn: (slug) => insightsApi.paperPortfolios.pause(slug),
    onSuccess: (_, slug) => {
      qc.invalidateQueries({ queryKey: insightsKeys.paperPortfolios() });
      qc.invalidateQueries({ queryKey: insightsKeys.paperPortfolio(slug) });
    },
  });
}

export function useResumePortfolio() {
  const qc = useQueryClient();
  return useMutation<PaperPortfolioSummary, Error, string>({
    mutationFn: (slug) => insightsApi.paperPortfolios.resume(slug),
    onSuccess: (_, slug) => {
      qc.invalidateQueries({ queryKey: insightsKeys.paperPortfolios() });
      qc.invalidateQueries({ queryKey: insightsKeys.paperPortfolio(slug) });
    },
  });
}
