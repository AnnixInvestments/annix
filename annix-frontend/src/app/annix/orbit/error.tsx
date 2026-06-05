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

  return (
    <BrandedErrorScreen
      area="Annix Orbit"
      error={error}
      reset={reset}
      backHref="/annix/orbit"
      backLabel="Back to Annix Orbit"
      brandButtonClass={ORBIT_BUTTON_CLASS}
    />
  );
}
