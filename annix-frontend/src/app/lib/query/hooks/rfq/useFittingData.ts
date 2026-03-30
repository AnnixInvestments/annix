import { useQuery } from "@tanstack/react-query";
import { masterDataApi } from "@/app/lib/api/client";
import { fittingKeys } from "../../keys";

export function useAnsiFittingTypes() {
  return useQuery({
    queryKey: fittingKeys.ansiTypes(),
    queryFn: () => masterDataApi.ansiFittingTypes(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAnsiFittingSchedules(fittingType: string | null) {
  return useQuery({
    queryKey: fittingKeys.ansiSchedules(fittingType || ""),
    queryFn: () => masterDataApi.ansiFittingSchedules(fittingType!),
    enabled: !!fittingType,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAnsiFittingSizes(fittingType: string | null, schedule?: string) {
  return useQuery({
    queryKey: fittingKeys.ansiSizes(fittingType || "", schedule),
    queryFn: () => masterDataApi.ansiFittingSizes(fittingType!, schedule),
    enabled: !!fittingType,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAnsiFittingDimensions(
  fittingType: string | null,
  nbMm: number | null,
  schedule: string | null,
  branchNbMm?: number,
) {
  return useQuery({
    queryKey: fittingKeys.ansiDimensions(fittingType || "", nbMm || 0, schedule || "", branchNbMm),
    queryFn: () => masterDataApi.ansiFittingDimensions(fittingType!, nbMm!, schedule!, branchNbMm),
    enabled: !!fittingType && !!nbMm && !!schedule,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useForgedFittingTypes() {
  return useQuery({
    queryKey: fittingKeys.forgedTypes(),
    queryFn: () => masterDataApi.forgedFittingTypes(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useForgedFittingSeries() {
  return useQuery({
    queryKey: fittingKeys.forgedSeries(),
    queryFn: () => masterDataApi.forgedFittingSeries(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useForgedFittingSizes(
  fittingType: string | null,
  pressureClass: number | null,
  connectionType: string | null,
) {
  return useQuery({
    queryKey: fittingKeys.forgedSizes(fittingType || "", pressureClass || 0, connectionType || ""),
    queryFn: () => masterDataApi.forgedFittingSizes(fittingType!, pressureClass!, connectionType!),
    enabled: !!fittingType && !!pressureClass && !!connectionType,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useForgedFittingDimensions(
  fittingType: string | null,
  nominalBoreMm: number | null,
  pressureClass: number | null,
  connectionType: string | null,
) {
  return useQuery({
    queryKey: fittingKeys.forgedDimensions(
      fittingType || "",
      nominalBoreMm || 0,
      pressureClass || 0,
      connectionType || "",
    ),
    queryFn: () =>
      masterDataApi.forgedFittingDimensions(
        fittingType!,
        nominalBoreMm!,
        pressureClass!,
        connectionType!,
      ),
    enabled: !!fittingType && !!nominalBoreMm && !!pressureClass && !!connectionType,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useMalleableFittingTypes() {
  return useQuery({
    queryKey: fittingKeys.malleableTypes(),
    queryFn: () => masterDataApi.malleableFittingTypes(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useMalleableFittingSizes(fittingType: string | null, pressureClass: number | null) {
  return useQuery({
    queryKey: fittingKeys.malleableSizes(fittingType || "", pressureClass || 0),
    queryFn: () => masterDataApi.malleableFittingSizes(fittingType!, pressureClass!),
    enabled: !!fittingType && !!pressureClass,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useMalleableFittingDimensions(fittingType: string | null, pressureClass?: number) {
  return useQuery({
    queryKey: fittingKeys.malleableDimensions(fittingType || "", pressureClass),
    queryFn: () => masterDataApi.malleableFittingDimensions(fittingType!, pressureClass),
    enabled: !!fittingType,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
