"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCoreActiveApp } from "./CoreActiveAppContext";

function dashboardPathFor(app: "stock-control" | "au-rubber"): string {
  return `/core/portal/${app}/dashboard`;
}

export default function CorePortalIndexPage() {
  const router = useRouter();
  const core = useCoreActiveApp();
  const activeApp = core.activeApp;

  useEffect(() => {
    if (activeApp) {
      router.replace(dashboardPathFor(activeApp));
    }
  }, [activeApp, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-accent)]" />
    </div>
  );
}
