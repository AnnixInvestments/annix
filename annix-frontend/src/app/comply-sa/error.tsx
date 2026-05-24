"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function ComplySaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Annix Sentinel error:", error);
    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return <AppUpdateNotice brandButtonClass="bg-teal-500 hover:bg-teal-600" />;
  }

  return (
    <BrandedErrorScreen
      area="Annix Sentinel"
      error={error}
      reset={reset}
      backHref="/comply-sa"
      brandButtonClass="bg-teal-500 hover:bg-teal-600"
    />
  );
}
