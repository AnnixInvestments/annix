import { useQuery, useQueryClient } from "@tanstack/react-query";
import { insightsApi, type PriceBar } from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function useAssetHistory(symbol: string | null, fromIsoDate?: string) {
  return useQuery<PriceBar[]>({
    queryKey: insightsKeys.assetHistory(symbol ?? "", fromIsoDate),
    queryFn: () => {
      if (!symbol) return Promise.resolve([]);
      return insightsApi.assets.history(symbol, fromIsoDate);
    },
    enabled: symbol !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHistoryCount(symbol: string | null) {
  return useQuery({
    queryKey: insightsKeys.historyCount(symbol ?? ""),
    queryFn: () => {
      if (!symbol) return Promise.resolve({ symbol: "", rows: 0 });
      return insightsApi.admin.historyCount(symbol);
    },
    enabled: symbol !== null,
    staleTime: 60 * 1000,
  });
}

export function useInvalidateAssetData() {
  const qc = useQueryClient();
  return (symbol: string) => {
    qc.invalidateQueries({ queryKey: insightsKeys.asset(symbol) });
  };
}
