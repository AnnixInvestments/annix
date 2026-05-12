import { useQuery } from "@tanstack/react-query";
import { insightsApi, type SignalSnapshotResponse } from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function useSignalsLatest() {
  return useQuery<SignalSnapshotResponse[]>({
    queryKey: insightsKeys.signalsLatest(),
    queryFn: () => insightsApi.signals.latest(),
    staleTime: 60 * 1000,
  });
}

export function useSignalHistory(symbol: string | null, limit?: number) {
  return useQuery<SignalSnapshotResponse[]>({
    queryKey: insightsKeys.signalHistory(symbol ?? "", limit),
    queryFn: () => {
      if (!symbol) return Promise.resolve([]);
      return insightsApi.signals.history(symbol, limit);
    },
    enabled: symbol !== null,
    staleTime: 60 * 1000,
  });
}
