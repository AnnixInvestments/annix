import { useQuery } from "@tanstack/react-query";
import { annixOrbitApiClient, type OrbitAuditEvent } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitCandidateAudit(candidateId: number) {
  return useQuery<OrbitAuditEvent[]>({
    queryKey: annixOrbitKeys.auditEvents.forCandidate(candidateId),
    queryFn: () => annixOrbitApiClient.candidateAuditEvents(candidateId),
    enabled: Number.isFinite(candidateId) && candidateId > 0,
    staleTime: 60 * 1000,
  });
}
