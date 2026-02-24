import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type AssignUserAccessDto,
  type InviteUserDto,
  type InviteUserResponse,
  type RbacApp,
  type RbacAppDetail,
  type RbacSearchUser,
  type RbacUserAccess,
  type UpdateUserAccessDto,
} from "@/app/lib/api/adminApi";
import { rbacKeys } from "../../keys";

export function useRbacApps() {
  return useQuery<RbacApp[]>({
    queryKey: rbacKeys.apps.list(),
    queryFn: () => adminApiClient.rbacApps(),
  });
}

export function useRbacAppDetails(code: string) {
  return useQuery<RbacAppDetail>({
    queryKey: rbacKeys.apps.detail(code),
    queryFn: () => adminApiClient.rbacAppDetails(code),
    enabled: !!code,
  });
}

export function useRbacUsersWithAccess(appCode: string) {
  return useQuery<RbacUserAccess[]>({
    queryKey: rbacKeys.apps.users(appCode),
    queryFn: () => adminApiClient.rbacUsersWithAccess(appCode),
    enabled: !!appCode,
  });
}

export function useRbacSearchUsers(query: string) {
  return useQuery<RbacSearchUser[]>({
    queryKey: rbacKeys.users.search(query),
    queryFn: () => adminApiClient.rbacSearchUsers(query),
    enabled: query.length >= 2,
  });
}

export function useRbacAssignAccess() {
  const queryClient = useQueryClient();

  return useMutation<RbacUserAccess, Error, { userId: number; dto: AssignUserAccessDto }>({
    mutationFn: ({ userId, dto }) => adminApiClient.rbacAssignAccess(userId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.dto.appCode) });
    },
  });
}

export function useRbacUpdateAccess() {
  const queryClient = useQueryClient();

  return useMutation<
    RbacUserAccess,
    Error,
    { accessId: number; dto: UpdateUserAccessDto; appCode: string }
  >({
    mutationFn: ({ accessId, dto }) => adminApiClient.rbacUpdateAccess(accessId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.appCode) });
    },
  });
}

export function useRbacRevokeAccess() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, { accessId: number; appCode: string }>({
    mutationFn: ({ accessId }) => adminApiClient.rbacRevokeAccess(accessId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.appCode) });
    },
  });
}

export function useRbacInviteUser() {
  const queryClient = useQueryClient();

  return useMutation<InviteUserResponse, Error, InviteUserDto>({
    mutationFn: (dto) => adminApiClient.rbacInviteUser(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.appCode) });
    },
  });
}
