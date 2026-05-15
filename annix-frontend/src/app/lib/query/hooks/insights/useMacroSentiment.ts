import { useQuery } from "@tanstack/react-query";
import { insightsApi, type MacroSentimentSnapshot } from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function useMacroToday() {
  return useQuery<MacroSentimentSnapshot | null>({
    queryKey: insightsKeys.macroToday(),
    queryFn: () => insightsApi.macro.today(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMacroHistory(limit?: number) {
  return useQuery<MacroSentimentSnapshot[]>({
    queryKey: insightsKeys.macroHistory(limit),
    queryFn: () => insightsApi.macro.history(limit),
    staleTime: 5 * 60 * 1000,
  });
}
