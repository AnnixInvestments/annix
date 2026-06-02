import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitSubmission,
  type OrbitSubmissionCreateInput,
  type OrbitSubmissionUpdateInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSubmissions() {
  return useQuery<OrbitSubmission[]>({
    queryKey: annixOrbitKeys.submissions.list(),
    queryFn: () => annixOrbitApiClient.submissions(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitSubmissionCreateInput) => annixOrbitApiClient.createSubmission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.submissions.all });
    },
  });
}

export function useOrbitUpdateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitSubmissionUpdateInput }) =>
      annixOrbitApiClient.updateSubmission(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.submissions.all });
    },
  });
}

export function useOrbitDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.submissions.all });
    },
  });
}
