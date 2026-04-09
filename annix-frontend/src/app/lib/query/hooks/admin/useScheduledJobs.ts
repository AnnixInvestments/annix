import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GlobalSettingsDto, NightSuspensionHours } from "@/app/lib/api/adminApi";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys";

export function useScheduledJobs() {
  return useQuery({
    queryKey: adminKeys.scheduledJobs.list(),
    queryFn: () => adminApiClient.scheduledJobs(),
    refetchInterval: 30_000,
  });
}

export function usePauseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminApiClient.pauseScheduledJob(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}

export function useResumeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminApiClient.resumeScheduledJob(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}

export function useUpdateJobFrequency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; cronExpression: string }) =>
      adminApiClient.updateScheduledJobFrequency(params.name, params.cronExpression),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}

export function useUpdateJobNightSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; nightSuspensionHours: NightSuspensionHours }) =>
      adminApiClient.updateScheduledJobNightSuspension(params.name, params.nightSuspensionHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}

export function useSyncScheduledJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApiClient.syncScheduledJobs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}

export function useScheduledJobsSyncStatus() {
  return useQuery({
    queryKey: [...adminKeys.scheduledJobs.all, "sync-status"],
    queryFn: () => adminApiClient.scheduledJobsSyncStatus(),
    refetchInterval: 30_000,
  });
}

export function useScheduledJobsGlobalSettings() {
  return useQuery({
    queryKey: [...adminKeys.scheduledJobs.all, "global-settings"],
    queryFn: () => adminApiClient.scheduledJobsGlobalSettings(),
    refetchInterval: 30_000,
  });
}

export function useUpdateScheduledJobsGlobalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: GlobalSettingsDto) =>
      adminApiClient.updateScheduledJobsGlobalSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.scheduledJobs.all });
    },
  });
}
