"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PortalTokenStore } from "@/app/lib/api/portalTokenStore";
import {
  adminTokenStore,
  auRubberTokenStore,
  setActivePortalStore,
  stockControlTokenStore,
} from "@/app/lib/api/portalTokenStores";
import { queryClient } from "@/app/lib/query/queryClient";
import type { CoreApp } from "./config/navAppMap";

const ACTIVE_APP_STORAGE_KEY = "coreActiveApp";
const AU_RUBBER_AUTH_CACHE_KEY = "auRubberAuthCache";
const NIX_SESSION_STORAGE_KEY = "nix-chat-session-id";
const CORE_PORTAL_AUTH_CHANNEL = "core-portal-auth";

interface CoreActiveAppContextValue {
  activeApp: CoreApp | null;
  enabledApps: CoreApp[];
  switchApp: (app: CoreApp) => void;
  logout: () => void;
}

const CoreActiveAppContext = createContext<CoreActiveAppContextValue | undefined>(undefined);

function isValidApp(value: string | null): value is CoreApp {
  return value === "stock-control" || value === "au-rubber";
}

function storeForApp(app: CoreApp): PortalTokenStore {
  if (app === "stock-control") {
    return stockControlTokenStore;
  }
  return auRubberTokenStore;
}

function appSegmentFromPath(pathname: string): CoreApp | null {
  const parts = pathname.split("/").filter((p) => p.length > 0);
  const prefixOk = parts[0] === "core" && parts[1] === "portal";
  if (!prefixOk) {
    return null;
  }
  const segment = parts[2];
  const seg = segment ?? null;
  return isValidApp(seg) ? seg : null;
}

function persistedActiveApp(): CoreApp | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(ACTIVE_APP_STORAGE_KEY);
  const value = raw ?? null;
  return isValidApp(value) ? value : null;
}

/**
 * INTERIM ENTITLEMENT DERIVATION (3e).
 *
 * The backend `/auth/resolve-app` response currently exposes only `{ app }`
 * and the backend is frozen for this phase, so we cannot read a server
 * `enabledApps` list yet. We derive entitlement from which portal token store
 * is locally authenticated (a no-network `isAuthenticated()` probe). A store
 * only holds a token because the user logged in / was provisioned for that app.
 *
 * SECURITY: we look ONLY at the stock-control and au-rubber stores — never the
 * admin store. ANNIX_ADMIN scope presence is NOT AU entitlement; a plain admin
 * without AU provisioning has no auRubber token and therefore never resolves to
 * "au-rubber" here.
 *
 * TODO(#395): replace with the `enabledApps` field once `/auth/resolve-app`
 * (or a follow-up entitlement endpoint) exposes it server-side.
 */
function deriveEnabledApps(): CoreApp[] {
  const apps: CoreApp[] = [];
  if (stockControlTokenStore.isAuthenticated()) {
    apps.push("stock-control");
  }
  if (auRubberTokenStore.isAuthenticated()) {
    apps.push("au-rubber");
  }
  return apps;
}

function resolveActiveApp(pathname: string, enabledApps: CoreApp[]): CoreApp | null {
  const segmentApp = appSegmentFromPath(pathname);
  if (segmentApp && enabledApps.includes(segmentApp)) {
    return segmentApp;
  }

  const persisted = persistedActiveApp();
  if (persisted && enabledApps.includes(persisted)) {
    return persisted;
  }

  if (enabledApps.length === 1) {
    const only = enabledApps[0];
    return only ?? null;
  }

  return null;
}

function dashboardPathFor(app: CoreApp): string {
  return `/core/portal/${app}/dashboard`;
}

export function CoreActiveAppProvider(props: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [enabledApps, setEnabledApps] = useState<CoreApp[]>(() => deriveEnabledApps());
  const [activeApp, setActiveApp] = useState<CoreApp | null>(() =>
    resolveActiveApp(pathname, enabledApps),
  );

  // Entitlement is derived from the live token stores, so recompute it when a
  // store may have changed (another tab logged in/out → storage event; tab
  // refocus; route change) instead of freezing the first-render snapshot. A
  // newly-authenticated second app then appears without a full reload.
  const recomputeEnabledApps = useCallback(() => {
    setEnabledApps((prev) => {
      const next = deriveEnabledApps();
      const lengthChanged = prev.length !== next.length;
      const itemsChanged = prev.some((app, i) => app !== next[i]);
      const changed = lengthChanged || itemsChanged;
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    recomputeEnabledApps();
  }, [recomputeEnabledApps, pathname]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("storage", recomputeEnabledApps);
    window.addEventListener("focus", recomputeEnabledApps);
    document.addEventListener("visibilitychange", recomputeEnabledApps);
    return () => {
      window.removeEventListener("storage", recomputeEnabledApps);
      window.removeEventListener("focus", recomputeEnabledApps);
      document.removeEventListener("visibilitychange", recomputeEnabledApps);
    };
  }, [recomputeEnabledApps]);

  useEffect(() => {
    setActiveApp(resolveActiveApp(pathname, enabledApps));
  }, [pathname, enabledApps]);

  useEffect(() => {
    if (activeApp) {
      setActivePortalStore(storeForApp(activeApp));
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_APP_STORAGE_KEY, activeApp);
      }
    } else {
      setActivePortalStore(null);
    }
    return () => {
      setActivePortalStore(null);
    };
  }, [activeApp]);

  useEffect(() => {
    // None of the two stores authenticated → kick to the unified login.
    if (enabledApps.length === 0) {
      router.replace("/core");
    }
  }, [enabledApps, router]);

  const hardClearAllAuth = useCallback(() => {
    // LOGOUT CLEAR-LIST (security-critical). Unconditionally wipes BOTH stores.
    stockControlTokenStore.clear();
    auRubberTokenStore.clear();
    // Also clear the admin token: a left-behind adminAccessToken can re-mint an
    // SC session via the legacy adminBridge on a provider remount. Clearing it
    // is intentional and also signs the user out of the /admin portal.
    adminTokenStore.clear();
    setActivePortalStore(null);
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      // Equivalent to AuRubberAuthContext.clearCachedAuth() (that fn is not
      // exported and its file is read-only here).
      localStorage.removeItem(AU_RUBBER_AUTH_CACHE_KEY);
      localStorage.removeItem(ACTIVE_APP_STORAGE_KEY);
      // Drop the persisted Nix chat-session id so the next user can't resume a
      // prior user's assistant session.
      localStorage.removeItem(NIX_SESSION_STORAGE_KEY);
      // Legacy token keys Nix's chatAuthHeaders falls back to (lib/nix/chat-api.ts)
      // — clear so a stale value can't authenticate a post-logout chat request.
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
    }
    queryClient().clear();
  }, []);

  const logout = useCallback(() => {
    hardClearAllAuth();
    // Defeat tryAdoptSessionFromAnotherTab: tell every other /core/portal tab
    // to clear too, so a sibling tab can't re-seed this one via the relay.
    // eslint-disable-next-line no-restricted-syntax -- SSR + feature guard
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CORE_PORTAL_AUTH_CHANNEL);
      channel.postMessage({ type: "logout" });
      channel.close();
    }
    setActiveApp(null);
    router.replace("/core");
  }, [hardClearAllAuth, router]);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR + feature guard
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(CORE_PORTAL_AUTH_CHANNEL);
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      const type = data?.type;
      if (type === "logout") {
        hardClearAllAuth();
        setActiveApp(null);
        router.replace("/core");
      }
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [hardClearAllAuth, router]);

  const switchApp = useCallback(
    (app: CoreApp) => {
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_APP_STORAGE_KEY, app);
      }
      setActiveApp(app);
      router.push(dashboardPathFor(app));
    },
    [router],
  );

  const value = useMemo<CoreActiveAppContextValue>(
    () => ({ activeApp, enabledApps, switchApp, logout }),
    [activeApp, enabledApps, switchApp, logout],
  );

  return (
    <CoreActiveAppContext.Provider value={value}>{props.children}</CoreActiveAppContext.Provider>
  );
}

export function useCoreActiveApp(): CoreActiveAppContextValue {
  const context = useContext(CoreActiveAppContext);
  if (context === undefined) {
    throw new Error("useCoreActiveApp must be used within a CoreActiveAppProvider");
  }
  return context;
}
