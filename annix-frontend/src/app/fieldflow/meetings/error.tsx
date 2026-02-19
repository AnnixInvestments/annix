"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "../components/ErrorBoundary";

export default function MeetingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Meetings error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load meetings"
      message="There was a problem loading your meetings. Please try again."
    />
  );
}
