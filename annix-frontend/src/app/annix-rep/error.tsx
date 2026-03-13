"use client";

import { PageErrorFallback } from "./components/ErrorBoundary";

export default function AnnixRepError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <PageErrorFallback
      error={error}
      reset={reset}
      title="Unable to load Annix Rep"
      message="There was a problem loading this page. Please try again or contact support if the problem persists."
    />
  );
}
