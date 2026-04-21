"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { usePollingInterval } from "@/app/lib/query/hooks";
import { stockControlKeys } from "@/app/lib/query/keys";

const SIX_HOURS = 6 * 60 * 60 * 1000;

interface NotificationCountResult {
  count: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useNotificationCount(): NotificationCountResult {
  const refetchInterval = usePollingInterval("stock-control:notification-count", SIX_HOURS);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [...stockControlKeys.notifications.all, "count"],
    queryFn: () => stockControlApiClient.notificationCount(),
    staleTime: 60_000,
    // eslint-disable-next-line no-restricted-syntax -- value sourced from usePollingInterval() above
    refetchInterval,
  });

  const rawCount = data?.count;
  const count = rawCount || 0;

  const refetch = async () => {
    await queryClient.invalidateQueries({
      queryKey: [...stockControlKeys.notifications.all, "count"],
    });
  };

  return { count, isLoading, refetch };
}
