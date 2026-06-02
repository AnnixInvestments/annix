import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitTalentCandidate,
  type OrbitTalentCandidateInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitTalentCandidates() {
  return useQuery<OrbitTalentCandidate[]>({
    queryKey: annixOrbitKeys.talentCandidates.list(),
    queryFn: () => annixOrbitApiClient.talentCandidates(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateTalentCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitTalentCandidateInput) =>
      annixOrbitApiClient.createTalentCandidate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCandidates.all });
    },
  });
}

export function useOrbitUpdateTalentCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitTalentCandidateInput }) =>
      annixOrbitApiClient.updateTalentCandidate(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCandidates.all });
    },
  });
}

export function useOrbitDeleteTalentCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteTalentCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCandidates.all });
    },
  });
}
