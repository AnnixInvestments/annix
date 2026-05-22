"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AmixLogo from "./AmixLogo";

// Simple event emitter for session expiry
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

interface SessionExpiredModalProps {
  /**
   * Optional explicit redirect URL. If omitted, the modal infers the portal
   * from the current pathname (e.g. /stock-control/... → /stock-control/login,
   * /au-rubber/... → /au-rubber/login) so SC / AU-Rubber / RFQ users are sent
   * to the right portal's login screen instead of always /customer/login.
   */
  loginUrl?: string;
}

interface PortalRoute {
  prefix: string;
  login: string;
  refreshEndpoint: string;
  refreshTokenKey: string;
  accessTokenKey: string;
}

const PORTAL_ROUTES: PortalRoute[] = [
  {
    prefix: "/stock-control",
    login: "/stock-control/login",
    refreshEndpoint: "/stock-control/auth/refresh",
    refreshTokenKey: "stockControlRefreshToken",
    accessTokenKey: "stockControlAccessToken",
  },
  {
    prefix: "/au-rubber",
    login: "/au-rubber/login",
    refreshEndpoint: "/au-rubber/auth/refresh",
    refreshTokenKey: "auRubberRefreshToken",
    accessTokenKey: "auRubberAccessToken",
  },
  {
    prefix: "/admin",
    login: "/admin/login",
    refreshEndpoint: "/admin/auth/refresh",
    refreshTokenKey: "adminRefreshToken",
    accessTokenKey: "adminAccessToken",
  },
  {
    prefix: "/supplier",
    login: "/supplier/login",
    refreshEndpoint: "/supplier/auth/refresh",
    refreshTokenKey: "supplierRefreshToken",
    accessTokenKey: "supplierAccessToken",
  },
  {
    prefix: "/annix/orbit",
    login: "/annix/orbit/login",
    refreshEndpoint: "/customer/auth/refresh",
    refreshTokenKey: "customerRefreshToken",
    accessTokenKey: "customerAccessToken",
  },
  {
    prefix: "/annix-rep",
    login: "/annix-rep/login",
    refreshEndpoint: "/annix-rep/auth/refresh",
    refreshTokenKey: "annixRepRefreshToken",
    accessTokenKey: "annixRepAccessToken",
  },
];

const DEFAULT_PORTAL: PortalRoute = {
  prefix: "/customer",
  login: "/customer/login",
  refreshEndpoint: "/customer/auth/refresh",
  refreshTokenKey: "customerRefreshToken",
  accessTokenKey: "customerAccessToken",
};

function currentPortal(): PortalRoute {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return DEFAULT_PORTAL;
  const path = window.location.pathname;
  const match = PORTAL_ROUTES.find((p) => path.startsWith(p.prefix));
  return match ?? DEFAULT_PORTAL;
}

function inferLoginUrl(): string {
  return currentPortal().login;
}

// Attempt to refresh the active portal's access token directly from
// the modal. The global API client's 401 handler already wiped the
// refresh token before firing sessionExpiredEvent, so this is mostly
// a courtesy probe — if the user landed in this modal via a real
// 401 flow it'll return false and the modal will route to login.
// Returns true if a fresh access token has been written back to
// localStorage.
async function tryRefreshActivePortalToken(): Promise<boolean> {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return false;
  const portal = currentPortal();
  const refreshToken = localStorage.getItem(portal.refreshTokenKey);
  if (!refreshToken) return false;
  try {
    const rawApiBase = process.env.NEXT_PUBLIC_API_URL;
    const apiBase = rawApiBase || "/api";
    const response = await fetch(`${apiBase}${portal.refreshEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    const accessToken = data?.access_token;
    const newRefreshToken = data?.refresh_token;
    if (accessToken && newRefreshToken) {
      localStorage.setItem(portal.accessTokenKey, accessToken);
      localStorage.setItem(portal.refreshTokenKey, newRefreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Session Expired Modal
 *
 * Branded modal that appears when any 401 fires through the global
 * sessionExpiredEvent. Offers two recovery paths:
 *  - "Refresh page" — primary; just reloads, letting the portal's auth
 *    context try a token refresh on mount. Recovers seamlessly when the
 *    session is still valid on the server but the access token has merely
 *    rotated.
 *  - "Sign in again" — secondary; clears tokens and routes to the active
 *    portal's login (Stock Control, AU-Rubber, etc.) when refresh isn't
 *    enough.
 *
 * Mount once in the root layout. Trigger via `sessionExpiredEvent.emit()`
 * from any 401 handler.
 */
export default function SessionExpiredModal(props: SessionExpiredModalProps) {
  const explicitLoginUrl = props.loginUrl;
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = sessionExpiredEvent.subscribe(() => {
      setIsVisible(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogin = () => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      localStorage.removeItem("customerAccessToken");
      localStorage.removeItem("customerRefreshToken");
      localStorage.removeItem("supplierAccessToken");
      localStorage.removeItem("supplierRefreshToken");
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
      localStorage.removeItem("stockControlAccessToken");
      localStorage.removeItem("stockControlRefreshToken");
      localStorage.removeItem("auRubberAccessToken");
      localStorage.removeItem("auRubberRefreshToken");
      localStorage.removeItem("annixRepAccessToken");
      localStorage.removeItem("annixRepRefreshToken");
      localStorage.removeItem("authToken");
    }
    const target = explicitLoginUrl ?? inferLoginUrl();
    window.location.href = target;
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const refreshed = await tryRefreshActivePortalToken();
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window === "undefined") return;
    if (refreshed) {
      // Fresh access token written back to localStorage. A full
      // reload re-runs the page's auth-aware data fetching with the
      // new token and the modal stays gone.
      window.location.reload();
      return;
    }
    // Refresh token was already burnt by the API client's 401
    // handler before the modal fired — there's nothing to recover
    // and a bare reload would re-show this same modal a second
    // later. Route the user straight to login instead.
    handleLogin();
  };

  if (!isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Navy header with logo */}
        <div
          className="px-8 py-6 flex flex-col items-center"
          style={{ backgroundColor: "#323288" }}
        >
          <AmixLogo size="lg" showText useSignatureFont />
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          {/* Session expired icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Your session has timed out</h2>

          <p className="text-gray-600 mb-6">
            Sessions expire after a period of inactivity for security. Try Refresh first — if your
            session can still be restored, the page will reload with no loss of work. If it can't,
            we'll send you straight to sign in again.
          </p>

          {/* Primary: refresh — attempts a real token refresh and either reloads
              (success) or routes to login (failure). */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            style={{ backgroundColor: "#FF8A00" }}
          >
            {isRefreshing ? "Refreshing…" : "Refresh page"}
          </button>

          {/* Secondary: skip the refresh probe and go straight to login */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isRefreshing}
            className="mt-3 w-full py-2 px-6 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Sign in again
          </button>
        </div>

        <div className="h-1.5" style={{ backgroundColor: "#FF8A00" }} />
      </div>
    </div>,
    document.body,
  );
}
