import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { referenceKeys } from "../../keys/referenceKeys";

export interface PipeReferenceData {
  nominalBores: number[];
  schedules: string[];
  endTypes: unknown[];
  tolerances: unknown[];
  materialGroups: unknown[];
  flangeOd: Record<string, number>;
  workingPressureBar: number[];
  workingTemperatureCelsius: number[];
  ansiPressureClasses: number[];
}

async function fetchPipeReferenceData(): Promise<PipeReferenceData> {
  const response = await fetch(`${browserBaseUrl()}/public/reference/pipe-specs`);
  if (!response.ok) {
    throw new Error("Failed to fetch pipe reference data");
  }
  return response.json();
}

export function usePipeReferenceData() {
  return useQuery<PipeReferenceData>({
    queryKey: referenceKeys.pipeSpecs(),
    queryFn: fetchPipeReferenceData,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
