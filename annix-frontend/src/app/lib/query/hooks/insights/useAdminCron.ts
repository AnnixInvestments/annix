"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CronRunStatusDto, insightsApi } from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function useRunFullCron() {
  const qc = useQueryClient();
  return useMutation<{ accepted: boolean; alreadyRunning: boolean }, Error, void>({
    mutationFn: () => insightsApi.admin.runFullCron(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: insightsKeys.cronStatus() });
    },
  });
}

export function useCronStatus(options?: { pollWhileRunning?: boolean }) {
  const optionsResolved = options ?? {};
  const pollWhileRunningRaw = optionsResolved.pollWhileRunning;
  const pollWhileRunning = pollWhileRunningRaw ?? false;
  return useQuery<CronRunStatusDto>({
    queryKey: insightsKeys.cronStatus(),
    queryFn: () => insightsApi.admin.cronStatus(),
    // eslint-disable-next-line no-restricted-syntax -- bounded 3s polling only while consumer sets pollWhileRunning=true (admin cron status surface, not background)
    refetchInterval: pollWhileRunning ? 3000 : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}
