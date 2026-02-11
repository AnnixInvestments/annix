import { useMutation, useQuery } from "@tanstack/react-query";
import { masterDataApi } from "@/app/lib/api/client";
import { calculatorKeys } from "../../keys";

type ReducerType = "CONCENTRIC" | "ECCENTRIC";

export interface ReducerMassInput {
  largeDiameterMm: number;
  smallDiameterMm: number;
  lengthMm: number;
  wallThicknessMm: number;
  densityKgM3?: number;
  reducerType?: ReducerType;
  quantity?: number;
}

export interface ReducerMassResult {
  largeDiameterMm: number;
  smallDiameterMm: number;
  largeInnerDiameterMm: number;
  smallInnerDiameterMm: number;
  lengthMm: number;
  wallThicknessMm: number;
  densityKgM3: number;
  outerVolumeM3: number;
  innerVolumeM3: number;
  steelVolumeM3: number;
  massPerUnitKg: number;
  totalMassKg: number;
  quantity: number;
  reducerType: ReducerType;
}

export interface ReducerAreaInput {
  largeDiameterMm: number;
  smallDiameterMm: number;
  lengthMm: number;
  wallThicknessMm: number;
  densityKgM3?: number;
  reducerType?: ReducerType;
  quantity?: number;
  extensionLargeMm?: number;
  extensionSmallMm?: number;
  extensionLargeWallThicknessMm?: number;
  extensionSmallWallThicknessMm?: number;
}

export interface ReducerAreaResult {
  largeDiameterMm: number;
  smallDiameterMm: number;
  largeInnerDiameterMm: number;
  smallInnerDiameterMm: number;
  lengthMm: number;
  slantHeightMm: number;
  coneAngleDegrees: number;
  reducerExternalAreaM2: number;
  reducerInternalAreaM2: number;
  extensionLargeExternalAreaM2: number;
  extensionLargeInternalAreaM2: number;
  extensionSmallExternalAreaM2: number;
  extensionSmallInternalAreaM2: number;
  totalExternalAreaM2: number;
  totalInternalAreaM2: number;
  totalCombinedAreaM2: number;
  areaPerUnitM2: number;
  quantity: number;
  reducerType: ReducerType;
}

export interface ReducerFullInput {
  largeDiameterMm: number;
  smallDiameterMm: number;
  lengthMm: number;
  wallThicknessMm: number;
  densityKgM3?: number;
  reducerType?: ReducerType;
  quantity?: number;
  extensionLargeMm?: number;
  extensionSmallMm?: number;
  coatingRatePerM2?: number;
}

export interface ReducerFullResult {
  mass: ReducerMassResult;
  area: Omit<
    ReducerAreaResult,
    | "extensionLargeExternalAreaM2"
    | "extensionLargeInternalAreaM2"
    | "extensionSmallExternalAreaM2"
    | "extensionSmallInternalAreaM2"
  >;
  externalCoatingCost?: number;
  internalCoatingCost?: number;
  totalCoatingCost?: number;
}

export interface StandardReducerLengthResult {
  largeNbMm: number;
  smallNbMm: number;
  standardLengthMm: number;
}

export function useReducerMass() {
  return useMutation<ReducerMassResult, Error, ReducerMassInput>({
    mutationFn: (data) => masterDataApi.calculateReducerMass(data),
  });
}

export function useReducerArea() {
  return useMutation<ReducerAreaResult, Error, ReducerAreaInput>({
    mutationFn: (data) => masterDataApi.calculateReducerArea(data),
  });
}

export function useReducerFull() {
  return useMutation<ReducerFullResult, Error, ReducerFullInput>({
    mutationFn: (data) => masterDataApi.calculateReducerFull(data),
  });
}

export function useStandardReducerLength(largeNbMm: number, smallNbMm: number) {
  return useQuery<StandardReducerLengthResult>({
    queryKey: calculatorKeys.reducer.standardLength(largeNbMm, smallNbMm),
    queryFn: () => masterDataApi.getStandardReducerLength(largeNbMm, smallNbMm),
    enabled: largeNbMm > 0 && smallNbMm > 0 && largeNbMm > smallNbMm,
    staleTime: Infinity,
  });
}
