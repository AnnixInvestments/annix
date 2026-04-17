import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NightSuspensionHours,
  PollingJobRuntimeConfigDto,
  PollingJobsGlobalSettingsDto,
} from "@/app/lib/api/adminApi";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys";
import { API_BASE_URL } from "@/lib/api-config";

const FIVE_MINUTES = 5 * 60 * 1000;

export function usePollingJobs() {
  return useQuery({
    queryKey: adminKeys.pollingJobs.list(),
    queryFn: () => adminApiClient.pollingJobs(),
    // eslint-disable-next-line no-restricted-syntax -- this is the admin page that configures polling itself
    refetchInterval: 2 * 60 * 1000,
  });
}

export function usePausePollingJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminApiClient.pausePollingJob(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pollingJobs.all });
    },
  });
}

export function useResumePollingJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminApiClient.resumePollingJob(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pollingJobs.all });
    },
  });
}

export function useUpdatePollingJobInterval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; intervalMs: number }) =>
      adminApiClient.updatePollingJobInterval(params.name, params.intervalMs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pollingJobs.all });
    },
  });
}

export function useUpdatePollingJobNightSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; nightSuspensionHours: NightSuspensionHours }) =>
      adminApiClient.updatePollingJobNightSuspension(params.name, params.nightSuspensionHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pollingJobs.all });
    },
  });
}

export function usePollingJobsGlobalSettings() {
  return useQuery({
    queryKey: adminKeys.pollingJobs.globalSettings(),
    queryFn: () => adminApiClient.pollingJobsGlobalSettings(),
    // eslint-disable-next-line no-restricted-syntax -- this is the admin page that configures polling itself
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUpdatePollingJobsGlobalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: PollingJobsGlobalSettingsDto) =>
      adminApiClient.updatePollingJobsGlobalSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pollingJobs.all });
    },
  });
}

async function fetchPollingConfig(): Promise<PollingJobRuntimeConfigDto> {
  const response = await fetch(`${API_BASE_URL}/public/polling-jobs/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch polling config (${response.status})`);
  }
  return response.json();
}

export function usePollingConfig() {
  return useQuery({
    queryKey: adminKeys.pollingJobs.config(),
    queryFn: fetchPollingConfig,
    staleTime: FIVE_MINUTES,
    // eslint-disable-next-line no-restricted-syntax -- source of truth for usePollingInterval; must poll itself
    refetchInterval: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
}

export function usePollingInterval(jobName: string, fallbackMs: number): number | false {
  const { data } = usePollingConfig();
  if (!data) return fallbackMs;
  const job = data.jobs[jobName];
  if (!job) return fallbackMs;
  if (!job.active) return false;
  if (job.suspendedNow) return false;
  return job.intervalMs;
}
