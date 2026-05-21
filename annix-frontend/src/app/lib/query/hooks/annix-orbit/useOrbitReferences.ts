import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type CandidateReference } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitReferences(status?: string | null) {
  return useQuery<CandidateReference[]>({
    queryKey: annixOrbitKeys.references.list(status),
    queryFn: () => annixOrbitApiClient.references(status ?? undefined),
    staleTime: 2 * 60 * 1000,
  });
}
