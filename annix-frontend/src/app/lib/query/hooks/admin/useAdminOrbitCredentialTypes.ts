import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type CreateOrbitCredentialTypeInput,
  type OrbitCredentialType,
  type UpdateOrbitCredentialTypeInput,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitCredentialTypes() {
  return useQuery<OrbitCredentialType[]>({
    queryKey: adminKeys.orbitCredentialTypes.list(),
    queryFn: () => adminApiClient.orbitCredentialTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminCreateOrbitCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrbitCredentialTypeInput) =>
      adminApiClient.createOrbitCredentialType(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitCredentialTypes.all });
    },
  });
}

export function useAdminUpdateOrbitCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateOrbitCredentialTypeInput }) =>
      adminApiClient.updateOrbitCredentialType(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitCredentialTypes.all });
    },
  });
}

export function useAdminDeleteOrbitCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApiClient.deleteOrbitCredentialType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitCredentialTypes.all });
    },
  });
}
