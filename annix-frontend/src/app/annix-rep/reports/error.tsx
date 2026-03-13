"use client";

import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ReportsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load reports"
      message="There was a problem loading your reports. Please try again."
    />
  );
}
