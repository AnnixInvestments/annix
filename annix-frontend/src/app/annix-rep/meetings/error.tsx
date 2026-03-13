"use client";

import { PageErrorFallback } from "../components/ErrorBoundary";

export default function MeetingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load meetings"
      message="There was a problem loading your meetings. Please try again."
    />
  );
}
