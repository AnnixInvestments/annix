import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type SeekerCredential,
  type SeekerCredentialInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvSeekerCredentials(enabled: boolean = true) {
  return useQuery<{ credentials: SeekerCredential[] }>({
    queryKey: annixOrbitKeys.seekerCredentials.list(),
    queryFn: () => annixOrbitApiClient.listSeekerCredentials(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvCreateSeekerCredential() {
  const queryClient = useQueryClient();
  return useMutation<{ credential: SeekerCredential }, Error, SeekerCredentialInput>({
    mutationFn: (input) => annixOrbitApiClient.createSeekerCredential(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerCredentials.all });
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
    mutationFn: ({ id, input }) => annixOrbitApiClient.updateSeekerCredential(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerCredentials.all });
    },
  });
}

export function useCvDeleteSeekerCredential() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => annixOrbitApiClient.deleteSeekerCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerCredentials.all });
    },
  });
}

interface CredentialAutofillResponse {
  created: number;
  credentials: SeekerCredential[];
  reason?: "no-candidate" | "no-cv-text" | "no-credential-keywords" | "ai-failed";
}

export function useCvAutofillSeekerCredentials() {
  const queryClient = useQueryClient();
  return useMutation<CredentialAutofillResponse, Error, void>({
    mutationFn: () => annixOrbitApiClient.autofillSeekerCredentialsFromCv(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.seekerCredentials.all });
    },
  });
}
