import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitJob,
  type OrbitJobInput,
  type OrbitJobMatchResult,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitRecruiterJobs() {
  return useQuery<OrbitJob[]>({
    queryKey: annixOrbitKeys.recruiterJobs.list(),
    queryFn: () => annixOrbitApiClient.recruiterJobs(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitRecruiterJobMatches(jobId: number | null) {
  return useQuery<OrbitJobMatchResult[]>({
    queryKey: annixOrbitKeys.recruiterJobs.matches(jobId),
    queryFn: () => annixOrbitApiClient.recruiterJobMatches(jobId as number),
    enabled: jobId != null,
    staleTime: 60 * 1000,
  });
}

export function useOrbitCreateRecruiterJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitJobInput) => annixOrbitApiClient.createRecruiterJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterJobs.all });
    },
  });
}

export function useOrbitUpdateRecruiterJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitJobInput }) =>
      annixOrbitApiClient.updateRecruiterJob(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterJobs.all });
    },
  });
}

export function useOrbitDeleteRecruiterJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteRecruiterJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.recruiterJobs.all });
    },
  });
}
