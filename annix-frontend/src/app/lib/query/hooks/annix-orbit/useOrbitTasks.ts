import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitTask,
  type OrbitTaskInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitTasks() {
  return useQuery<OrbitTask[]>({
    queryKey: annixOrbitKeys.tasks.list(),
    queryFn: () => annixOrbitApiClient.orbitTasks(),
    staleTime: 60 * 1000,
  });
}

export function useOrbitCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitTaskInput) => annixOrbitApiClient.createOrbitTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.tasks.all });
    },
  });
}

export function useOrbitUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitTaskInput }) =>
      annixOrbitApiClient.updateOrbitTask(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.tasks.all });
    },
  });
}

export function useOrbitDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteOrbitTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.tasks.all });
    },
  });
}
