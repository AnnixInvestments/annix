import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type SeekerApplication,
  type UpdateSeekerApplicationInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSeekerApplications(enabled: boolean = true) {
  return useQuery<SeekerApplication[]>({
    queryKey: annixOrbitKeys.seekerApplications.list(),
    queryFn: () => annixOrbitApiClient.listMyApplications().then((res) => res.applications),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitUpdateSeekerApplication() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { id: number; input: UpdateSeekerApplicationInput }
  >({
    mutationFn: ({ id, input }) => annixOrbitApiClient.updateMyApplication(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerApplications.all });
    },
  });
}

export function useOrbitDeleteSeekerApplication() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => annixOrbitApiClient.deleteMyApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerApplications.all });
    },
  });
}
