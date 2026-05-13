import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cvAssistantApiClient,
  type SeekerCredential,
  type SeekerCredentialInput,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvSeekerCredentials(enabled: boolean = true) {
  return useQuery<{ credentials: SeekerCredential[] }>({
    queryKey: cvAssistantKeys.seekerCredentials.list(),
    queryFn: () => cvAssistantApiClient.listSeekerCredentials(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvCreateSeekerCredential() {
  const queryClient = useQueryClient();
  return useMutation<{ credential: SeekerCredential }, Error, SeekerCredentialInput>({
    mutationFn: (input) => cvAssistantApiClient.createSeekerCredential(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerCredentials.all });
    },
  });
}

export function useCvUpdateSeekerCredential() {
  const queryClient = useQueryClient();
  return useMutation<
    { credential: SeekerCredential },
    Error,
    { id: number; input: Partial<SeekerCredentialInput> }
  >({
    mutationFn: ({ id, input }) => cvAssistantApiClient.updateSeekerCredential(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerCredentials.all });
    },
  });
}

export function useCvDeleteSeekerCredential() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => cvAssistantApiClient.deleteSeekerCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cvAssistantKeys.seekerCredentials.all });
    },
  });
}
