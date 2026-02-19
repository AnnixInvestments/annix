"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ProspectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Prospects error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load prospects"
      message="There was a problem loading your prospects. Please try again."
    />
  );
}
