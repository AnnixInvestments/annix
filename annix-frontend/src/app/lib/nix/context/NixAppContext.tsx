"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type NixCapability, useNixCapabilities } from "@/app/lib/query/hooks";

/**
 * NixAppContext — per-app Nix configuration, read by `<NixAssistant />`
 * and any future Nix surfaces. Each app's portal layout wraps its tree in
 * `<NixAppProvider appCode="..." />` to declare which app it is; the
 * provider then fetches that app's registered capabilities from the
 * backend and exposes them to the chat panel.
 *
 * Phase 2 of issue #262. See `docs/nix-shared-module-architecture.md`.
 */

export interface NixAppContextValue {
  /** App code matches the appCode each backend INixCapability declares. */
  readonly appCode: string;

  /** Capabilities registered for this app. Empty array while loading. */
  readonly capabilities: readonly NixCapability[];

  /** True until the first capability fetch resolves. */
  readonly isLoading: boolean;

  /** True if the capability fetch errored — chat still works, just without suggestions. */
  readonly hasError: boolean;

  /** Convenience — capability keys that have a how-to guide attached. */
  readonly guideSlugs: readonly string[];

  /** Convenience — capability keys that have a walkthrough definition. */
  readonly walkthroughKeys: readonly string[];
}

const NixAppContext = createContext<NixAppContextValue | null>(null);

interface NixAppProviderProps {
  readonly appCode: string;
  readonly children: ReactNode;
}

export function NixAppProvider(props: NixAppProviderProps) {
  const { appCode, children } = props;
  const capabilitiesQuery = useNixCapabilities(appCode);

  const queryData = capabilitiesQuery.data;
  const queryIsLoading = capabilitiesQuery.isLoading;
  const queryIsError = capabilitiesQuery.isError;
  const value = useMemo<NixAppContextValue>(() => {
    const capabilities = queryData ?? [];
    return {
      appCode,
      capabilities,
      isLoading: queryIsLoading,
      hasError: queryIsError,
      guideSlugs: capabilities.filter((c) => c.guideSlug).map((c) => c.guideSlug as string),
      walkthroughKeys: capabilities.filter((c) => c.hasWalkthrough).map((c) => c.key),
    };
  }, [appCode, queryData, queryIsError, queryIsLoading]);

  return <NixAppContext.Provider value={value}>{children}</NixAppContext.Provider>;
}

/**
 * Read the current NixAppContext. Returns null if no provider is mounted —
 * existing call-sites that pre-date the provider keep working.
 */
export function useNixApp(): NixAppContextValue | null {
  return useContext(NixAppContext);
}

/**
 * Strict variant — throws if no provider is mounted. Use in components that
 * require the context to function (e.g. capability-aware suggestion lists).
 */
export function useNixAppStrict(): NixAppContextValue {
  const value = useContext(NixAppContext);
  if (!value) {
    throw new Error(
      "useNixAppStrict must be used within a <NixAppProvider />. Mount one in your portal layout.",
    );
  }
  return value;
}
