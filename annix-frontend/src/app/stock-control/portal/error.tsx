"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function StockControlPortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Stock Control portal error:", error);

    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return (
      <AppUpdateNotice brandButtonClass="bg-[var(--sc-primary,#323288)] hover:bg-[var(--sc-primary-hover,#252560)]" />
    );
  }

  return (
    <BrandedErrorScreen
      area="Stock Control"
      error={error}
      reset={reset}
      backHref="/stock-control/portal/dashboard"
      brandButtonClass="bg-[var(--sc-primary,#323288)] hover:bg-[var(--sc-primary-hover,#252560)]"
    />
  );
}
