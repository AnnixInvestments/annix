"use client";

import { useQuery } from "@tanstack/react-query";
import { isString } from "es-toolkit/compat";

const rawBuildId = process.env.NEXT_PUBLIC_APP_BUILD_ID;
const CLIENT_BUILD_ID = isString(rawBuildId) ? rawBuildId : "";

const POLL_INTERVAL_MS = 120_000;

interface BuildIdResponse {
  buildId?: string;
}

async function fetchDeployedBuildId(): Promise<string> {
  const response = await fetch("/app-build-id", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`build-id check failed: ${response.status}`);
  }
  const data = (await response.json()) as BuildIdResponse;
  const buildId = data.buildId;
  return isString(buildId) ? buildId : "";
}

export interface AppUpdateState {
  updateAvailable: boolean;
  deployedBuildId: string;
}

/**
 * Detects when the deployed build differs from the build this tab is running.
 * Polls the lightweight /app-build-id endpoint every 2 minutes and on tab
 * focus / reconnect. Returns false until both ids are known, so it never
 * false-positives during boot. Drives the repo-wide <AppUpdateBanner />.
 */
export function useAppUpdateAvailable(): AppUpdateState {
  const query = useQuery({
    queryKey: ["app-build-id"],
    queryFn: fetchDeployedBuildId,
    // eslint-disable-next-line no-restricted-syntax -- 2-min build-id poll; drives the global update banner, negligible cost
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const data = query.data;
  const deployedBuildId = isString(data) ? data : "";

  const haveBothIds = CLIENT_BUILD_ID.length > 0 && deployedBuildId.length > 0;
  const updateAvailable = haveBothIds && deployedBuildId !== CLIENT_BUILD_ID;

  return { updateAvailable, deployedBuildId };
}
