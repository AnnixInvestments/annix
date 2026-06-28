"use client";

import type { ReactNode } from "react";
import { AuRubberAuthProvider } from "@/app/context/AuRubberAuthContext";
import { StockControlAuthProvider } from "@/app/context/StockControlAuthContext";
import { useCoreActiveApp } from "./CoreActiveAppContext";
import { CoreAppPicker } from "./CoreAppPicker";

function CoreRedirectSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}

/**
 * Mounts EXACTLY ONE of the real per-app auth providers, keyed by `activeApp`
 * so switching apps fully unmounts/remounts (the two checkAuth effects never
 * race). OpsAuthContext is intentionally never mounted here — it is
 * stock-control-hardcoded and would re-create the cross-app token bleed.
 */
export function ActiveAppAuthMount(props: { children: ReactNode }) {
  const core = useCoreActiveApp();
  const activeApp = core.activeApp;
  const enabledApps = core.enabledApps;

  if (activeApp === null) {
    if (enabledApps.length > 1) {
      return <CoreAppPicker />;
    }
    // enabledApps.length === 0 → CoreActiveAppProvider already redirects to /core.
    return <CoreRedirectSkeleton />;
  }

  if (activeApp === "stock-control") {
    return (
      <StockControlAuthProvider key="stock-control">{props.children}</StockControlAuthProvider>
    );
  }

  return <AuRubberAuthProvider key="au-rubber">{props.children}</AuRubberAuthProvider>;
}
