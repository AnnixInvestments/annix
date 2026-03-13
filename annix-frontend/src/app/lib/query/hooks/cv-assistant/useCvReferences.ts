import { useQuery } from "@tanstack/react-query";
import { type CandidateReference, cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvReferences(status?: string | null) {
  return useQuery<CandidateReference[]>({
    queryKey: cvAssistantKeys.references.list(status),
    queryFn: () => cvAssistantApiClient.references(status ?? undefined),
    staleTime: 2 * 60 * 1000,
  });
}
