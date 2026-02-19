"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Reports error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load reports"
      message="There was a problem loading your reports. Please try again."
    />
  );
}
