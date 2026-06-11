"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

const ORBIT_BUTTON_CLASS =
  "bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)]";

export default function AnnixOrbitError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Annix Orbit error:", error);
    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return <AppUpdateNotice brandButtonClass={ORBIT_BUTTON_CLASS} />;
  }

  // Keep seekers inside their module — their "home" is the seeker dashboard,
  // not the Orbit landing page.
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; error boundaries can render server-side
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const isSeeker = pathname.startsWith("/annix/orbit/seeker");

  return (
    <BrandedErrorScreen
      area="Annix Orbit"
      error={error}
      reset={reset}
      backHref={isSeeker ? "/annix/orbit/seeker/dashboard" : "/annix/orbit"}
      backLabel={isSeeker ? "Back to my dashboard" : "Back to Annix Orbit"}
      brandButtonClass={ORBIT_BUTTON_CLASS}
    />
  );
}
