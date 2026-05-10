"use client";

import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";

const PUBLIC_FLAGS_QUERY_KEY = ["public-feature-flags"] as const;

async function fetchPublicFeatureFlags(): Promise<Record<string, boolean>> {
  const response = await fetch(`${browserBaseUrl()}/feature-flags`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch feature flags (${response.status})`);
  }
  return response.json();
}

/**
 * Reads a single feature flag from the public `/feature-flags` endpoint and
 * returns `{ enabled, isLoading }`. Used to gate add-on UI surfaces (Nix
 * quote-from-documents, future paid add-ons) so a base-tier deployment
 * never sees the entry points. Backend `/feature-flags` is public — no
 * auth needed — so this works from any portal.
 *
 * Defaults to `enabled: false` until the fetch completes, which means the
 * initial render hides the gated UI rather than flashing it on then off.
 * Acceptable trade-off: a brief 'feature not yet visible' moment beats
 * showing then stripping a sellable feature.
 */
export function useFeatureFlagEnabled(flagKey: string): {
  enabled: boolean;
  isLoading: boolean;
} {
  const query = useQuery<Record<string, boolean>>({
    queryKey: PUBLIC_FLAGS_QUERY_KEY,
    queryFn: fetchPublicFeatureFlags,
    staleTime: 5 * 60 * 1000,
  });
  const data = query.data;
  const enabled = data ? data[flagKey] === true : false;
  return { enabled, isLoading: query.isLoading };
}
