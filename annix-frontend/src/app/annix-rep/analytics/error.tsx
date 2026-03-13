"use client";

import { PageErrorFallback } from "../components/ErrorBoundary";

export default function AnalyticsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load analytics"
      message="There was a problem loading your analytics data. Please try again."
    />
  );
}
