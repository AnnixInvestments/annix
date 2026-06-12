import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitTalentPool,
  type OrbitTalentPoolInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitTalentPools() {
  return useQuery<OrbitTalentPool[]>({
    queryKey: annixOrbitKeys.talentPools.list(),
    queryFn: () => annixOrbitApiClient.talentPools(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitTalentPoolInput) => annixOrbitApiClient.createTalentPool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentPools.all });
    },
  });
}

export function useOrbitUpdateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitTalentPoolInput }) =>
      annixOrbitApiClient.updateTalentPool(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentPools.all });
    },
  });
}

export function useOrbitDeleteTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteTalentPool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.talentPools.all });
    },
  });
}
