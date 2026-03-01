"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PendingAccessRequestsResponse,
  type RemoteAccessRequestResponse,
  remoteAccessApi,
} from "@/app/lib/api/remoteAccessApi";

interface UseRemoteAccessPollingOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
}

export function useRemoteAccessPolling({
  enabled = true,
  pollIntervalMs = 30000,
}: UseRemoteAccessPollingOptions = {}) {
  const [pendingRequests, setPendingRequests] = useState<RemoteAccessRequestResponse[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const mountedRef = useRef(true);

  const checkPendingRequests = useCallback(async () => {
    if (!enabled) return;

    if (typeof window === "undefined") return;
    const token = localStorage.getItem("customerAccessToken");
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: PendingAccessRequestsResponse = await remoteAccessApi.pendingRequests();
      if (mountedRef.current) {
        setPendingRequests(result.requests);
        setCount(result.count);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to check pending requests");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    checkPendingRequests();

    if (enabled && pollIntervalMs > 0) {
      const interval = setInterval(checkPendingRequests, pollIntervalMs);
      return () => {
        mountedRef.current = false;
        clearInterval(interval);
      };
    }
    return () => {
      mountedRef.current = false;
    };
  }, [checkPendingRequests, enabled, pollIntervalMs]);

  const dismissRequest = useCallback((requestId: number) => {
    setDismissedIds((prev) => new Set([...prev, requestId]));
  }, []);

  const dismissAll = useCallback(() => {
    const allIds = pendingRequests.map((r) => r.id);
    setDismissedIds(new Set(allIds));
  }, [pendingRequests]);

  const respondToRequest = useCallback(
    async (requestId: number, approved: boolean, denialReason?: string) => {
      try {
        await remoteAccessApi.respondToRequest(requestId, { approved, denialReason });
        await checkPendingRequests();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to respond to request");
        return false;
      }
    },
    [checkPendingRequests],
  );

  const filteredRequests = pendingRequests.filter((r) => !dismissedIds.has(r.id));
  const hasPendingRequests = filteredRequests.length > 0;

  return {
    pendingRequests: filteredRequests,
    count: filteredRequests.length,
    isLoading,
    error,
    hasPendingRequests,
    refresh: checkPendingRequests,
    dismissRequest,
    dismissAll,
    respondToRequest,
  };
}
