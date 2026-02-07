"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PtRecommendationResult, ptRatingApi } from "@/app/lib/api/client";
import {
  BoltGradeRecommendation,
  isStainlessSteelSpec,
  recommendBoltGrade,
} from "@/app/lib/config/rfq/boltGradeRecommendations";
import {
  type GasketRecommendation,
  recommendGasket,
} from "@/app/lib/config/rfq/gasketRecommendations";

export type { GasketRecommendation };

import { log } from "@/app/lib/logger";

interface UsePtRecommendationsParams {
  standardId: number | undefined;
  workingPressureBar: number | undefined;
  temperatureCelsius: number | undefined;
  materialGroup?: string;
  currentPressureClassId?: number;
  steelSpecName?: string;
  pressureClassDesignation?: string;
  enabled?: boolean;
}

interface UsePtRecommendationsReturn {
  recommendations: PtRecommendationResult | null;
  boltRecommendation: BoltGradeRecommendation | null;
  gasketRecommendation: GasketRecommendation | null;
  isLoading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 300;

export function usePtRecommendations({
  standardId,
  workingPressureBar,
  temperatureCelsius,
  materialGroup,
  currentPressureClassId,
  steelSpecName,
  pressureClassDesignation,
  enabled = true,
}: UsePtRecommendationsParams): UsePtRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<PtRecommendationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isStainless = useMemo(() => isStainlessSteelSpec(steelSpecName), [steelSpecName]);

  const boltRecommendation = useMemo(() => {
    if (temperatureCelsius === undefined) return null;
    return recommendBoltGrade(temperatureCelsius, isStainless);
  }, [temperatureCelsius, isStainless]);

  const gasketRecommendation = useMemo(() => {
    if (temperatureCelsius === undefined) return null;
    return recommendGasket(temperatureCelsius, pressureClassDesignation, isStainless);
  }, [temperatureCelsius, pressureClassDesignation, isStainless]);

  const fetchRecommendations = useCallback(async () => {
    if (!standardId || workingPressureBar === undefined || temperatureCelsius === undefined) {
      setRecommendations(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await ptRatingApi.recommendations({
        standardId,
        workingPressureBar,
        temperatureCelsius,
        materialGroup,
        currentPressureClassId,
      });

      setRecommendations(result);
      log.debug("P-T recommendations fetched", { result });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to fetch recommendations";
      setError(message);
      if (message === "Backend unavailable") {
        log.debug("P-T recommendations: backend unavailable");
      } else {
        log.warn("P-T recommendations error", { message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [standardId, workingPressureBar, temperatureCelsius, materialGroup, currentPressureClassId]);

  useEffect(() => {
    if (!enabled) {
      setRecommendations(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchRecommendations();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRecommendations, enabled]);

  return {
    recommendations,
    boltRecommendation,
    gasketRecommendation,
    isLoading,
    error,
  };
}
