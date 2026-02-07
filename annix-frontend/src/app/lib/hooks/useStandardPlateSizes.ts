"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_STANDARD_PLATE_SIZES,
  StandardPlateSize,
} from "@/app/lib/config/rfq/bracketsAndPlates";
import { log } from "@/app/lib/logger";
import { pipeSteelWorkApi } from "@/app/lib/pipe-steel-work/api";

export interface UseStandardPlateSizesReturn {
  plateSizes: StandardPlateSize[];
  isLoading: boolean;
  error: string | null;
  plateSizeById: (id: string) => StandardPlateSize | null;
  plateSizesByCategory: (category: "small" | "medium" | "large") => StandardPlateSize[];
  refetch: () => void;
}

export function useStandardPlateSizes(): UseStandardPlateSizesReturn {
  const [plateSizes, setPlateSizes] = useState<StandardPlateSize[]>(FALLBACK_STANDARD_PLATE_SIZES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlateSizes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiSizes = await pipeSteelWorkApi.standardPlateSizes();

      if (apiSizes && apiSizes.length > 0) {
        const mappedSizes: StandardPlateSize[] = apiSizes.map((s) => ({
          id: s.id,
          name: s.name,
          lengthMm: s.lengthMm,
          widthMm: s.widthMm,
          thicknessMm: s.thicknessMm,
          category: s.category as "small" | "medium" | "large",
        }));
        setPlateSizes(mappedSizes);
        log.debug(`Loaded ${mappedSizes.length} standard plate sizes from API`);
      } else {
        log.debug("No plate sizes from API, using fallback");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load plate sizes";
      log.warn("Failed to fetch plate sizes from API, using fallback:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlateSizes();
  }, []);

  const plateSizeById = (id: string): StandardPlateSize | null => {
    return plateSizes.find((s) => s.id === id) || null;
  };

  const plateSizesByCategory = (category: "small" | "medium" | "large"): StandardPlateSize[] => {
    return plateSizes.filter((s) => s.category === category);
  };

  return {
    plateSizes,
    isLoading,
    error,
    plateSizeById,
    plateSizesByCategory,
    refetch: fetchPlateSizes,
  };
}
