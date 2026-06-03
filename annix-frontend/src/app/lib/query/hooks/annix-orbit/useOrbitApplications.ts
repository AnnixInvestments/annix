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
    { id: number; input: UpdateSeekerApplicationInput },
    { previous: SeekerApplication[] | undefined }
  >({
    mutationFn: ({ id, input }) => annixOrbitApiClient.updateMyApplication(id, input),
    onMutate: async ({ id, input }) => {
      const listKey = annixOrbitKeys.seekerApplications.list();
      await queryClient.cancelQueries({ queryKey: annixOrbitKeys.seekerApplications.all });
      const previous = queryClient.getQueryData<SeekerApplication[]>(listKey);
      if (previous) {
        const next = previous.map((app) => (app.id === id ? { ...app, ...input } : app));
        queryClient.setQueryData<SeekerApplication[]>(listKey, next);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      const previous = context?.previous;
      if (previous) {
        queryClient.setQueryData(annixOrbitKeys.seekerApplications.list(), previous);
      }
    },
    onSettled: () => {
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
