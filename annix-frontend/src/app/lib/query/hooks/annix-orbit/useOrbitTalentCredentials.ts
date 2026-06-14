import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitTalentCredential,
  type OrbitTalentCredentialInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitTalentCredentials(candidateId: number | null) {
  return useQuery<OrbitTalentCredential[]>({
    queryKey: annixOrbitKeys.talentCredentials.forCandidate(candidateId ?? 0),
    queryFn: () => annixOrbitApiClient.talentCredentials(candidateId ?? 0),
    enabled: candidateId !== null && candidateId > 0,
    staleTime: 60 * 1000,
  });
}

export function useOrbitTalentCredentialTypes() {
  return useQuery({
    queryKey: annixOrbitKeys.talentCredentials.types(),
    queryFn: () => annixOrbitApiClient.talentCredentialTypes(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useOrbitTalentCredentialsExpiring(withinDays = 30) {
  return useQuery({
    queryKey: annixOrbitKeys.talentCredentials.expiring(withinDays),
    queryFn: () => annixOrbitApiClient.talentCredentialsExpiring(withinDays),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCandidateSiteReady(candidateId: number | null) {
  return useQuery({
    queryKey: annixOrbitKeys.talentCredentials.siteReady(candidateId ?? 0),
    queryFn: () => annixOrbitApiClient.talentCandidateSiteReady(candidateId ?? 0),
    enabled: candidateId !== null && candidateId > 0,
    staleTime: 60 * 1000,
  });
}

export function useOrbitSiteReadyScores() {
  return useQuery({
    queryKey: annixOrbitKeys.talentCredentials.siteReadyScores(),
    queryFn: () => annixOrbitApiClient.talentSiteReadyScores(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateTalentCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { candidateId: number; data: OrbitTalentCredentialInput }) =>
      annixOrbitApiClient.createTalentCredential(vars.candidateId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCredentials.all });
    },
  });
}

export function useOrbitUpdateTalentCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { candidateId: number; id: number; data: OrbitTalentCredentialInput }) =>
      annixOrbitApiClient.updateTalentCredential(vars.candidateId, vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCredentials.all });
    },
  });
}

export function useOrbitDeleteTalentCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { candidateId: number; id: number }) =>
      annixOrbitApiClient.deleteTalentCredential(vars.candidateId, vars.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentCredentials.all });
    },
  });
}
