"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateMineLibraryMineInput,
  type CreateMineResponse,
  type DocNumberSearchRow,
  type MineLibraryExtractionRow,
  type MineLibraryMine,
  nixApi,
} from "@/app/lib/nix/api";
import { nixKeys } from "../../keys/nixKeys";

export function useMineLibraryMines(q?: string) {
  return useQuery<MineLibraryMine[]>({
    queryKey: nixKeys.mineLibrary.mines(q),
    queryFn: () => nixApi.listMineLibraryMines(q),
    staleTime: 60 * 1000,
  });
}

export function useMineLibraryExtractions(mineId: number | null) {
  return useQuery<MineLibraryExtractionRow[]>({
    queryKey: nixKeys.mineLibrary.extractionsForMine(mineId ?? 0),
    queryFn: () => {
      if (mineId === null) return Promise.resolve([] as MineLibraryExtractionRow[]);
      return nixApi.listMineLibraryExtractions(mineId);
    },
    enabled: mineId !== null,
    staleTime: 30 * 1000,
  });
}

export function useDocNumberSearch(
  q: string,
  options?: { mineId?: number | null; limit?: number; enabled?: boolean },
) {
  const trimmed = q.trim();
  const optMineId = options?.mineId;
  const optEnabled = options?.enabled;
  const mineIdKey = optMineId === null || optMineId === undefined ? null : optMineId;
  const enabledFlag = optEnabled === undefined ? true : optEnabled;
  const enabled = enabledFlag && trimmed.length >= 2;
  return useQuery<DocNumberSearchRow[]>({
    queryKey: nixKeys.mineLibrary.docNumberSearch(trimmed, mineIdKey),
    queryFn: () =>
      nixApi.searchMineLibraryByDocNumber(trimmed, {
        mineId: options?.mineId,
        limit: options?.limit,
      }),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateMineLibraryMine() {
  const queryClient = useQueryClient();
  return useMutation<CreateMineResponse, Error, CreateMineLibraryMineInput>({
    mutationFn: (input) => nixApi.createMineLibraryMine(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: nixKeys.mineLibrary.all });
    },
  });
}

export function useRetagExtractionMine() {
  const queryClient = useQueryClient();
  return useMutation<MineLibraryExtractionRow, Error, { extractionId: number; mineId: number }>({
    mutationFn: ({ extractionId, mineId }) => nixApi.retagExtractionMine(extractionId, mineId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: nixKeys.mineLibrary.all });
      void queryClient.invalidateQueries({ queryKey: nixKeys.extractions.all });
    },
  });
}

export function useClearExtractionMine() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, Error, number>({
    mutationFn: (extractionId) => nixApi.clearExtractionMine(extractionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: nixKeys.mineLibrary.all });
      void queryClient.invalidateQueries({ queryKey: nixKeys.extractions.all });
    },
  });
}
