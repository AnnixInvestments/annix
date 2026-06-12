import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitShortlist,
  type OrbitShortlistInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitShortlists() {
  return useQuery<OrbitShortlist[]>({
    queryKey: annixOrbitKeys.shortlists.list(),
    queryFn: () => annixOrbitApiClient.shortlists(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitShortlistInput) => annixOrbitApiClient.createShortlist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.shortlists.all });
    },
  });
}

export function useOrbitUpdateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitShortlistInput }) =>
      annixOrbitApiClient.updateShortlist(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.shortlists.all });
    },
  });
}

export function useOrbitDeleteShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteShortlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.shortlists.all });
    },
  });
}
