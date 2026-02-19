"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "./components/ErrorBoundary";

export default function FieldFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FieldFlow error:", error);
  }, [error]);

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load FieldFlow"
      message="There was a problem loading this page. Please try again or contact support if the problem persists."
    />
  );
}
