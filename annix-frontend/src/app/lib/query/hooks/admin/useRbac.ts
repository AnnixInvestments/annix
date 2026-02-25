import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AssignUserAccessDto,
  adminApiClient,
  type CreateRoleDto,
  type InviteUserDto,
  type InviteUserResponse,
  type RbacApp,
  type RbacAppDetail,
  type RbacDeleteRoleResponse,
  type RbacRoleProductsResponse,
  type RbacRoleResponse,
  type RbacSearchUser,
  type RbacUserAccess,
  type RbacUserWithAccessSummary,
  type UpdateRoleDto,
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

export function useRbacAllUsers() {
  return useQuery<RbacUserWithAccessSummary[]>({
    queryKey: rbacKeys.users.list(),
    queryFn: () => adminApiClient.rbacAllUsers(),
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
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.list() });
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
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.list() });
    },
  });
}

export function useRbacRevokeAccess() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, { accessId: number; appCode: string }>({
    mutationFn: ({ accessId }) => adminApiClient.rbacRevokeAccess(accessId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.appCode) });
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.list() });
    },
  });
}

export function useRbacInviteUser() {
  const queryClient = useQueryClient();

  return useMutation<InviteUserResponse, Error, InviteUserDto>({
    mutationFn: (dto) => adminApiClient.rbacInviteUser(dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.users(variables.appCode) });
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.list() });
    },
  });
}

export function useRbacRoleProducts(roleId: number) {
  return useQuery<RbacRoleProductsResponse>({
    queryKey: rbacKeys.roles.products(roleId),
    queryFn: () => adminApiClient.rbacRoleProducts(roleId),
    enabled: roleId > 0,
  });
}

export function useRbacCreateRole() {
  const queryClient = useQueryClient();

  return useMutation<RbacRoleResponse, Error, { appCode: string; dto: CreateRoleDto }>({
    mutationFn: ({ appCode, dto }) => adminApiClient.rbacCreateRole(appCode, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.detail(variables.appCode) });
    },
  });
}

export function useRbacUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation<RbacRoleResponse, Error, { roleId: number; dto: UpdateRoleDto; appCode: string }>({
    mutationFn: ({ roleId, dto }) => adminApiClient.rbacUpdateRole(roleId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.detail(variables.appCode) });
      queryClient.invalidateQueries({ queryKey: rbacKeys.roles.detail(variables.roleId) });
    },
  });
}

export function useRbacDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation<RbacDeleteRoleResponse, Error, { roleId: number; appCode: string }>({
    mutationFn: ({ roleId }) => adminApiClient.rbacDeleteRole(roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.apps.detail(variables.appCode) });
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.list() });
    },
  });
}

export function useRbacSetRoleProducts() {
  const queryClient = useQueryClient();

  return useMutation<RbacRoleProductsResponse, Error, { roleId: number; productKeys: string[] }>({
    mutationFn: ({ roleId, productKeys }) => adminApiClient.rbacSetRoleProducts(roleId, productKeys),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.roles.products(variables.roleId) });
    },
  });
}
