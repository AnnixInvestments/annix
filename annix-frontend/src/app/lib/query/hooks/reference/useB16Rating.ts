import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { type B16RatingInput, referenceKeys } from "../../keys/referenceKeys";

export interface B16RatingResponse {
  ratedPressureBar: number | null;
  margin: number | null;
  interpolationNotes: string | null;
  classSelection: {
    requiredClass: string;
    ratingAtTemperature: number;
    marginPercent: number;
    alternatives: Array<{
      pressureClass: string;
      ratingBar: number;
      sufficient: boolean;
    }>;
  } | null;
}

async function fetchB16Rating(input: B16RatingInput): Promise<B16RatingResponse> {
  const response = await fetch(`${browserBaseUrl()}/public/reference/b16-rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch B16.5 rating");
  }
  return response.json();
}

export function useB16Rating(input: B16RatingInput | null) {
  return useQuery<B16RatingResponse>({
    queryKey: referenceKeys.b16Rating(
      input ?? { materialGroup: "", pressureClass: "", temperatureC: 0 },
    ),
    queryFn: () => {
      if (!input) {
        throw new Error("b16Rating input required");
      }
      return fetchB16Rating(input);
    },
    enabled: input !== null,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
