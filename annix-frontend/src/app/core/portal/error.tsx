"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function CorePortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Core portal error:", error);
    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return <AppUpdateNotice brandButtonClass="bg-[#FF8A00] hover:bg-[#e67c00]" />;
  }

  return (
    <BrandedErrorScreen
      area="your workspace"
      error={error}
      reset={reset}
      backHref="/core/portal"
      backLabel="Back to workspace"
      brandButtonClass="bg-[#FF8A00] hover:bg-[#e67c00]"
    />
  );
}
