"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "./components/ErrorBoundary";

export default function FieldFlowError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
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
