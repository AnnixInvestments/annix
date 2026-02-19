"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "../components/ErrorBoundary";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analytics error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load analytics"
      message="There was a problem loading your analytics data. Please try again."
    />
  );
}
