"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColdCallSuggestion,
  fieldflowApi,
  OptimizedRoute,
  ScheduleGap,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "../../keys";

export function useScheduleGaps(date: string, minGapMinutes?: number) {
  return useQuery<ScheduleGap[]>({
    queryKey: fieldflowKeys.routes.gaps(date, minGapMinutes),
    queryFn: () => fieldflowApi.routes.scheduleGaps(date, minGapMinutes),
    enabled: Boolean(date),
  });
}

export function useColdCallSuggestions(
  date: string,
  currentLat?: number,
  currentLng?: number,
  maxSuggestions?: number,
) {
  return useQuery<ColdCallSuggestion[]>({
    queryKey: fieldflowKeys.routes.coldCallSuggestions(date, currentLat, currentLng),
    queryFn: () =>
      fieldflowApi.routes.coldCallSuggestions(date, currentLat, currentLng, maxSuggestions),
    enabled: Boolean(date),
  });
}

export function usePlanDayRoute(
  date: string,
  includeColdCalls?: boolean,
  currentLat?: number,
  currentLng?: number,
) {
  return useQuery<OptimizedRoute>({
    queryKey: fieldflowKeys.routes.planDay(date, includeColdCalls, currentLat, currentLng),
    queryFn: () => fieldflowApi.routes.planDayRoute(date, includeColdCalls, currentLat, currentLng),
    enabled: Boolean(date),
  });
}

export function useOptimizeRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      startLat,
      startLng,
      stops,
      returnToStart,
    }: {
      startLat: number;
      startLng: number;
      stops: Array<{ id: number; type: "prospect" | "meeting" }>;
      returnToStart?: boolean;
    }) => fieldflowApi.routes.optimizeRoute(startLat, startLng, stops, returnToStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.routes.all });
    },
  });
}
