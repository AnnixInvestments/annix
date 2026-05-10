"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function AuRubberPortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("AU Rubber portal error:", error);

    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return <AppUpdateNotice brandButtonClass="bg-yellow-600 hover:bg-yellow-700" />;
  }

  return (
    <BrandedErrorScreen
      area="AU Rubber"
      error={error}
      reset={reset}
      backHref="/au-rubber/portal/dashboard"
      brandButtonClass="bg-yellow-600 hover:bg-yellow-700"
    />
  );
}
