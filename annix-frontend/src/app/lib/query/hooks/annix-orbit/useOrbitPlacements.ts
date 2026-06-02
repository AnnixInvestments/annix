import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitPlacement,
  type OrbitPlacementInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitPlacements() {
  return useQuery<OrbitPlacement[]>({
    queryKey: annixOrbitKeys.placements.list(),
    queryFn: () => annixOrbitApiClient.placements(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitPlacementInput) => annixOrbitApiClient.createPlacement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.placements.all });
    },
  });
}

export function useOrbitUpdatePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitPlacementInput }) =>
      annixOrbitApiClient.updatePlacement(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.placements.all });
    },
  });
}

export function useOrbitDeletePlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deletePlacement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.placements.all });
    },
  });
}
