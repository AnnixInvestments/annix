"use client";

import { useEffect } from "react";

type SessionExpiredListener = () => void;
const listeners: Set<SessionExpiredListener> = new Set();

export const sessionExpiredEvent = {
  emit: () => {
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: SessionExpiredListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

interface SessionExpiredHandlerProps {
  /**
   * Optional explicit login URL. If omitted, the portal is inferred from the
   * current pathname so each portal's users go to their own sign-in screen.
   */
  loginUrl?: string;
}

interface PortalRoute {
  prefix: string;
  login: string;
  accessTokenKey: string;
  refreshTokenKey: string;
}

const PORTAL_ROUTES: PortalRoute[] = [
  {
    prefix: "/core/portal/stock-control",
    login: "/core",
    accessTokenKey: "stockControlAccessToken",
    refreshTokenKey: "stockControlRefreshToken",
  },
  {
    prefix: "/core/portal/au-rubber",
    login: "/core",
    accessTokenKey: "auRubberAccessToken",
    refreshTokenKey: "auRubberRefreshToken",
  },
  {
    prefix: "/ops/portal",
    login: "/core",
    accessTokenKey: "auRubberAccessToken",
    refreshTokenKey: "auRubberRefreshToken",
  },
  {
    prefix: "/stock-control",
    login: "/stock-control/login",
    accessTokenKey: "stockControlAccessToken",
    refreshTokenKey: "stockControlRefreshToken",
  },
  {
    prefix: "/au-rubber",
    login: "/au-rubber/login",
    accessTokenKey: "auRubberAccessToken",
    refreshTokenKey: "auRubberRefreshToken",
  },
  {
    prefix: "/admin",
    login: "/admin/login",
    accessTokenKey: "adminAccessToken",
    refreshTokenKey: "adminRefreshToken",
  },
  {
    prefix: "/supplier",
    login: "/supplier/login",
    accessTokenKey: "supplierAccessToken",
    refreshTokenKey: "supplierRefreshToken",
  },
  {
    prefix: "/annix/orbit",
    login: "/annix/orbit/login",
    accessTokenKey: "annixOrbitAccessToken",
    refreshTokenKey: "annixOrbitRefreshToken",
  },
  {
    prefix: "/annix-pulse",
    login: "/annix-pulse/login",
    accessTokenKey: "annixRepAccessToken",
    refreshTokenKey: "annixRepRefreshToken",
  },
];

const DEFAULT_PORTAL: PortalRoute = {
  prefix: "/customer",
  login: "/customer/login",
  accessTokenKey: "customerAccessToken",
  refreshTokenKey: "customerRefreshToken",
};

function currentPortal(): PortalRoute {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return DEFAULT_PORTAL;
  const path = window.location.pathname;
  const match = PORTAL_ROUTES.find((portal) => path.startsWith(portal.prefix));
  return match ?? DEFAULT_PORTAL;
}

/**
 * Session-expiry handler.
 *
 * Silent refresh already runs upstream (the API clients refresh the active
 * portal's token on a 401 before this fires), so by the time `sessionExpiredEvent`
 * emits, the session genuinely cannot be recovered. Clear the active portal's
 * tokens and send the user straight to that portal's login with `?expired=1`
 * (login pages read this to show a quiet "please sign in again" notice).
 *
 * No dialog, no "refresh the page" prompt. Mount once in the root layout.
 */
export default function SessionExpiredModal(props: SessionExpiredHandlerProps) {
  const explicitLoginUrl = props.loginUrl;

  useEffect(() => {
    const unsubscribe = sessionExpiredEvent.subscribe(() => {
      // eslint-disable-next-line no-restricted-syntax -- SSR guard
      if (typeof window === "undefined") return;
      const portal = currentPortal();
      const loginPath = explicitLoginUrl ?? portal.login;
      if (window.location.pathname === loginPath) return;
      localStorage.removeItem(portal.accessTokenKey);
      localStorage.removeItem(portal.refreshTokenKey);
      const here = `${window.location.pathname}${window.location.search}`;
      const returnUrl = encodeURIComponent(here);
      const separator = loginPath.includes("?") ? "&" : "?";
      window.location.href = `${loginPath}${separator}expired=1&returnUrl=${returnUrl}`;
    });
    return () => {
      unsubscribe();
    };
  }, [explicitLoginUrl]);

  return null;
}
