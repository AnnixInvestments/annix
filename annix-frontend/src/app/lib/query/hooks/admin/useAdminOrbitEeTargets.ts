import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitEeTarget,
  type UpsertOrbitEeTargetInput,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitEeTargets() {
  return useQuery<OrbitEeTarget[]>({
    queryKey: adminKeys.orbitEeTargets.list(),
    queryFn: () => adminApiClient.orbitEeTargets(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminUpsertOrbitEeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertOrbitEeTargetInput) => adminApiClient.upsertOrbitEeTarget(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitEeTargets.all });
    },
  });
}

export function useAdminDeleteOrbitEeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApiClient.deleteOrbitEeTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitEeTargets.all });
    },
  });
}
