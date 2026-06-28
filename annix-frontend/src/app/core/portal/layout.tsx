"use client";

import { type ReactNode, Suspense } from "react";
import { ActiveAppAuthMount } from "./ActiveAppAuthMount";
import { CoreActiveAppProvider } from "./CoreActiveAppContext";
import { CorePortalChrome } from "./components/CorePortalChrome";

function CorePortalFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-grad-from)]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}

export default function CorePortalLayout(props: { children: ReactNode }) {
  return (
    <Suspense fallback={<CorePortalFallback />}>
      <CoreActiveAppProvider>
        <ActiveAppAuthMount>
          <CorePortalChrome>{props.children}</CorePortalChrome>
        </ActiveAppAuthMount>
      </CoreActiveAppProvider>
    </Suspense>
  );
}
