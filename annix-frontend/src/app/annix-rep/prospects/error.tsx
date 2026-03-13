"use client";

import { PageErrorFallback } from "../components/ErrorBoundary";

export default function ProspectsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load prospects"
      message="There was a problem loading your prospects. Please try again."
    />
  );
}
