"use client";

import { useCallback, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface NotificationCountResult {
  count: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useNotificationCount(): NotificationCountResult {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const result = await stockControlApiClient.notificationCount();
      setCount(result.count);
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, isLoading, refetch: fetchCount };
}
