import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type CreateSeekerEmploymentInput,
  type SeekerEmploymentRecord,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitSeekerEmployment(enabled: boolean = true) {
  return useQuery<SeekerEmploymentRecord[]>({
    queryKey: annixOrbitKeys.seekerEmployment.list(),
    queryFn: () => annixOrbitApiClient.listMyEmployment().then((res) => res.records),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOrbitCreateSeekerEmployment() {
  const queryClient = useQueryClient();
  return useMutation<{ record: SeekerEmploymentRecord }, Error, CreateSeekerEmploymentInput>({
    mutationFn: (input) => annixOrbitApiClient.createMyEmployment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEmployment.all });
    },
  });
}

export function useOrbitReactivateJobSearch() {
  const queryClient = useQueryClient();
  return useMutation<{ refreshed: number }, Error, void>({
    mutationFn: () => annixOrbitApiClient.reactivateJobSearch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerEmployment.all });
    },
  });
}
