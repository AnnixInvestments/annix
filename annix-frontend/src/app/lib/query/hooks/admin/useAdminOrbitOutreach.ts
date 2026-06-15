import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitOutreachAsset,
  type OrbitOutreachSchedulePayload,
  type OrbitOutreachScheduleView,
  type OrbitOutreachSendPayload,
  type OrbitOutreachSendResult,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitOutreachAssets() {
  return useQuery<OrbitOutreachAsset[]>({
    queryKey: adminKeys.orbitOutreach.assets(),
    queryFn: () => adminApiClient.orbitOutreachAssets(),
    staleTime: 60 * 1000,
  });
}

export function useUploadOrbitOutreachAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { slot: string; label: string | null; file: File }) =>
      adminApiClient.uploadOrbitOutreachAsset(input.slot, input.label, input.file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitOutreach.assets() });
    },
  });
}

export function useDeleteOrbitOutreachAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApiClient.deleteOrbitOutreachAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitOutreach.assets() });
    },
  });
}

export function useSendOrbitOutreach() {
  const queryClient = useQueryClient();
  return useMutation<OrbitOutreachSendResult, Error, OrbitOutreachSendPayload>({
    mutationFn: (payload: OrbitOutreachSendPayload) => adminApiClient.sendOrbitOutreach(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitEarlyAccess.list() });
    },
  });
}

export function useAdminOrbitOutreachSchedules() {
  return useQuery<OrbitOutreachScheduleView[]>({
    queryKey: adminKeys.orbitOutreach.schedules(),
    queryFn: () => adminApiClient.orbitOutreachSchedules(),
    staleTime: 30 * 1000,
  });
}

export function useScheduleOrbitOutreach() {
  const queryClient = useQueryClient();
  return useMutation<OrbitOutreachScheduleView, Error, OrbitOutreachSchedulePayload>({
    mutationFn: (payload: OrbitOutreachSchedulePayload) =>
      adminApiClient.scheduleOrbitOutreach(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitOutreach.schedules() });
    },
  });
}

export function useCancelOrbitOutreachSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApiClient.cancelOrbitOutreachSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitOutreach.schedules() });
    },
  });
}

export function useRunDueOrbitOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApiClient.runDueOrbitOutreach(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitOutreach.schedules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitEarlyAccess.list() });
    },
  });
}
