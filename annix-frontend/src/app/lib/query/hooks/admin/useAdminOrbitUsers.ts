import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitUserInviteInput,
  type OrbitUserListResult,
  type OrbitUserUpdateInput,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitUsers(params: {
  type?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}) {
  const typeParam = params.type;
  const searchParam = params.search;
  return useQuery<OrbitUserListResult>({
    queryKey: adminKeys.orbitUsers.list({
      type: typeParam ?? undefined,
      search: searchParam ?? undefined,
      page: params.page,
      limit: params.limit,
    }),
    queryFn: () => adminApiClient.orbitUsers(params),
  });
}

export function useAdminInviteOrbitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrbitUserInviteInput) => adminApiClient.inviteOrbitUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitUsers.all });
    },
  });
}

export function useAdminResendOrbitUserInvite() {
  return useMutation({
    mutationFn: (userId: number) => adminApiClient.resendOrbitUserInvite(userId),
  });
}

export function useAdminUpdateOrbitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: OrbitUserUpdateInput }) =>
      adminApiClient.updateOrbitUser(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitUsers.all });
    },
  });
}

export function useAdminDeactivateOrbitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => adminApiClient.deactivateOrbitUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitUsers.all });
    },
  });
}

export function useAdminReactivateOrbitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => adminApiClient.reactivateOrbitUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitUsers.all });
    },
  });
}

export function useAdminDeleteOrbitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => adminApiClient.deleteOrbitUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitUsers.all });
    },
  });
}
