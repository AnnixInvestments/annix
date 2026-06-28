"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCoreActiveApp } from "../CoreActiveAppContext";
import type { CoreApp } from "../config/navAppMap";

const APP_LABELS: Record<CoreApp, string> = {
  "stock-control": "Stock Control",
  "au-rubber": "AU Rubber",
};

function pathTargetsApp(pathname: string, app: CoreApp): boolean {
  const prefix = `/core/portal/${app}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function pathTargetsOtherApp(pathname: string, activeApp: CoreApp): boolean {
  const otherApp: CoreApp = activeApp === "stock-control" ? "au-rubber" : "stock-control";
  return pathTargetsApp(pathname, otherApp);
}

function ContentSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}

/**
 * HARD-gates a `/core/portal` route to the active app's namespace. An
 * SC-active session can never render `/core/portal/au-rubber/*` (and
 * vice-versa) — the content is blocked, not merely hidden, so the other app's
 * PII never paints. Until the active auth provider has settled (`ready`), a
 * skeleton is shown so neither app's data flashes.
 */
export function CorePortalPageAccessGuard(props: {
  activeApp: CoreApp;
  ready: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const core = useCoreActiveApp();
  const otherApp: CoreApp = props.activeApp === "stock-control" ? "au-rubber" : "stock-control";

  if (pathTargetsOtherApp(pathname, props.activeApp)) {
    const blockedLabel = APP_LABELS[otherApp];
    const activeLabel = APP_LABELS[props.activeApp];
    const canSwitch = core.enabledApps.includes(otherApp);
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Wrong workspace</h2>
          <p className="mt-2 text-sm text-gray-700">
            {`You are signed in to ${activeLabel}. This page belongs to ${blockedLabel}.`}
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => core.switchApp(props.activeApp)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {`Go to ${activeLabel} dashboard`}
            </button>
            {canSwitch && (
              <button
                type="button"
                onClick={() => core.switchApp(otherApp)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {`Switch to ${blockedLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!props.ready) {
    return <ContentSkeleton />;
  }

  return <>{props.children}</>;
}
