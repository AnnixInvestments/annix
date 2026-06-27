"use client";

import { type ReactNode, Suspense } from "react";
import { ActiveAppAuthMount } from "./ActiveAppAuthMount";
import { CoreActiveAppProvider } from "./CoreActiveAppContext";
import { CorePortalChrome } from "./components/CorePortalChrome";

function CorePortalFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF8A00]" />
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
