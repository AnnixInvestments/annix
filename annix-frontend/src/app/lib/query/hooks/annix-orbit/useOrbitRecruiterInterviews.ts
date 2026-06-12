import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitRecruiterInterview,
  type OrbitRecruiterInterviewInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitRecruiterInterviews() {
  return useQuery<OrbitRecruiterInterview[]>({
    queryKey: annixOrbitKeys.recruiterInterviews.list(),
    queryFn: () => annixOrbitApiClient.recruiterInterviews(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateRecruiterInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitRecruiterInterviewInput) =>
      annixOrbitApiClient.createRecruiterInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterInterviews.all });
    },
  });
}

export function useOrbitUpdateRecruiterInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitRecruiterInterviewInput }) =>
      annixOrbitApiClient.updateRecruiterInterview(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterInterviews.all });
    },
  });
}

export function useOrbitDeleteRecruiterInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteRecruiterInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterInterviews.all });
    },
  });
}
