import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type CreateOrbitDismissReasonInput,
  type OrbitDismissReason,
  type UpdateOrbitDismissReasonInput,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitDismissReasons() {
  return useQuery<OrbitDismissReason[]>({
    queryKey: adminKeys.orbitDismissReasons.list(),
    queryFn: () => adminApiClient.orbitDismissReasons(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminCreateOrbitDismissReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrbitDismissReasonInput) =>
      adminApiClient.createOrbitDismissReason(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitDismissReasons.all });
    },
  });
}

export function useAdminUpdateOrbitDismissReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateOrbitDismissReasonInput }) =>
      adminApiClient.updateOrbitDismissReason(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitDismissReasons.all });
    },
  });
}

export function useAdminDeleteOrbitDismissReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApiClient.deleteOrbitDismissReason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitDismissReasons.all });
    },
  });
}
