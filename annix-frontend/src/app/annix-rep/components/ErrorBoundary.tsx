"use client";

import { Component, type ReactNode } from "react";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  area?: string;
  backHref?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);

    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const error = this.state.error;
      if (!error) return null;
      const area = this.props.area ? this.props.area : "Annix Rep";
      const backHref = this.props.backHref ? this.props.backHref : "/annix-rep";
      return (
        <BrandedErrorScreen
          area={area}
          error={error}
          reset={this.handleRetry}
          backHref={backHref}
          brandButtonClass="bg-blue-600 hover:bg-blue-700"
        />
      );
    }
    return this.props.children;
  }
}

interface PageErrorFallbackProps {
  error?: Error | null;
  reset?: () => void;
  /**
   * Kept for backwards compatibility. The branded error screen ignores
   * `title` / `message` and renders its own consistent copy with a
   * support code — but call sites that pass them won't break.
   */
  title?: string;
  message?: string;
  area?: string;
  backHref?: string;
}

export function PageErrorFallback(props: PageErrorFallbackProps) {
  const { error, reset } = props;
  const area = props.area ? props.area : "Annix Rep";
  const backHref = props.backHref ? props.backHref : "/annix-rep";
  const safeError: Error & { digest?: string } = error
    ? (error as Error & { digest?: string })
    : new Error("Unknown error");
  const handleReset = reset ? reset : () => window.location.reload();
  return (
    <BrandedErrorScreen
      area={area}
      error={safeError}
      reset={handleReset}
      backHref={backHref}
      brandButtonClass="bg-blue-600 hover:bg-blue-700"
    />
  );
}

export function QueryErrorFallback(props: {
  error?: Error | null;
  refetch?: () => void;
  title?: string;
  message?: string;
}) {
  const {
    error,
    refetch,
    title = "Failed to load data",
    message = "We couldn't fetch the requested data. Please check your connection and try again.",
  } = props;
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-medium text-red-800 dark:text-red-200">{title}</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{message}</p>
          {refetch && (
            <button
              onClick={refetch}
              className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Retry
            </button>
          )}
          {process.env.NODE_ENV === "development" && error && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                Error details
              </summary>
              <pre className="mt-1 text-xs text-red-600 dark:text-red-400 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
