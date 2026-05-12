"use client";

import { useEffect } from "react";
import { AppUpdateNotice } from "@/app/components/AppUpdateNotice";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function InsightsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Annix Insights portal error:", error);
    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return <AppUpdateNotice brandButtonClass="bg-[#FFA500] hover:bg-[#CC8400] text-gray-900" />;
  }

  return (
    <BrandedErrorScreen
      area="Annix Insights"
      error={error}
      reset={reset}
      backHref="/insights"
      brandButtonClass="bg-[#FFA500] hover:bg-[#CC8400] text-gray-900"
    />
  );
}
