import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitClient,
  type OrbitClientInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitClients() {
  return useQuery<OrbitClient[]>({
    queryKey: annixOrbitKeys.clients.list(),
    queryFn: () => annixOrbitApiClient.clients(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitClient(id: number) {
  return useQuery<OrbitClient>({
    queryKey: annixOrbitKeys.clients.detail(id),
    queryFn: () => annixOrbitApiClient.clientById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useOrbitCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitClientInput) => annixOrbitApiClient.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.clients.all });
    },
  });
}

export function useOrbitUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitClientInput }) =>
      annixOrbitApiClient.updateClient(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.clients.all });
    },
  });
}

export function useOrbitDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.clients.all });
    },
  });
}
