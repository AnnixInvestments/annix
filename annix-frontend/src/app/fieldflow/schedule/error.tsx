"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Schedule error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load schedule"
      message="There was a problem loading your schedule. Please try again."
    />
  );
}
