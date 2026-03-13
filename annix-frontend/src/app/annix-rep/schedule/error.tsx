"use client";

import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ScheduleError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load schedule"
      message="There was a problem loading your schedule. Please try again."
    />
  );
}
