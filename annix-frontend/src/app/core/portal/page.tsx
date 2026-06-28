"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCoreActiveApp } from "./CoreActiveAppContext";
import { CoreAppPicker } from "./CoreAppPicker";

/**
 * Landing page for `/core/portal` — makes the bare shell root a real route so
 * the "Back to workspace" link isn't a 404.
 *
 * Active-app resolution is already performed by the shell layout
 * (`CoreActiveAppProvider` + `ActiveAppAuthMount`, entitlement-aware): the
 * multiple-entitled-and-none-active case renders `CoreAppPicker` and the
 * none-authenticated case redirects to `/core` BEFORE this page mounts. So by
 * the time this page renders, `activeApp` is the single resolved/persisted app
 * — we just forward to its dashboard. The picker branch below is a defensive
 * fallback that mirrors the layout's ambiguous-case behaviour.
 */
export default function CorePortalIndexPage() {
  const router = useRouter();
  const { activeApp } = useCoreActiveApp();

  useEffect(() => {
    if (activeApp) {
      router.replace(`/core/portal/${activeApp}/dashboard`);
    }
  }, [activeApp, router]);

  if (!activeApp) {
    return <CoreAppPicker />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#FF8A00]" />
    </div>
  );
}
