import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AddWatchlistItemPayload,
  insightsApi,
  type WatchlistItemResponse,
} from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function useWatchlist() {
  return useQuery<WatchlistItemResponse[]>({
    queryKey: insightsKeys.watchlist(),
    queryFn: () => insightsApi.watchlist.list(),
    staleTime: 60 * 1000,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation<WatchlistItemResponse, Error, AddWatchlistItemPayload>({
    mutationFn: (payload) => insightsApi.watchlist.add(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insightsKeys.watchlist() });
    },
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => insightsApi.watchlist.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insightsKeys.watchlist() });
    },
  });
}
