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

const PORTAL_LOGIN_ROUTES: Array<{ prefix: string; login: string }> = [
  { prefix: "/stock-control", login: "/stock-control/login" },
  { prefix: "/au-rubber", login: "/au-rubber/login" },
  { prefix: "/admin", login: "/admin/login" },
  { prefix: "/supplier", login: "/supplier/login" },
  { prefix: "/cv-assistant", login: "/cv-assistant/login" },
  { prefix: "/annix-rep", login: "/annix-rep/login" },
];

function inferLoginUrl(): string {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return "/customer/login";
  const path = window.location.pathname;
  const match = PORTAL_LOGIN_ROUTES.find((p) => path.startsWith(p.prefix));
  return match ? match.login : "/customer/login";
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

  useEffect(() => {
    const unsubscribe = sessionExpiredEvent.subscribe(() => {
      setIsVisible(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = () => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

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
      localStorage.removeItem("authToken");
    }
    const target = explicitLoginUrl ?? inferLoginUrl();
    window.location.href = target;
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
            Sessions expire after a period of inactivity for security. Refreshing the page is
            usually enough to get you back in — your work on this page will be reloaded, and any
            saved changes are safe.
          </p>

          {/* Primary: refresh — usually recovers via the portal's auth refresh on mount */}
          <button
            type="button"
            onClick={handleRefresh}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
            style={{ backgroundColor: "#FFA500" }}
          >
            Refresh page
          </button>

          {/* Secondary: full sign-in if refresh isn't enough */}
          <button
            type="button"
            onClick={handleLogin}
            className="mt-3 w-full py-2 px-6 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign in again
          </button>

          <p className="mt-4 text-xs text-gray-400">
            Click Refresh first — it almost always works without losing context.
          </p>
        </div>

        <div className="h-1.5" style={{ backgroundColor: "#FFA500" }} />
      </div>
    </div>,
    document.body,
  );
}
