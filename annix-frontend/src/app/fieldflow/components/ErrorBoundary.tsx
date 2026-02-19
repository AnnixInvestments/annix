"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Please try again or contact support if the problem
              persists.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Reload page
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PageErrorFallbackProps {
  error?: Error | null;
  reset?: () => void;
  title?: string;
  message?: string;
}

export function PageErrorFallback({
  error,
  reset,
  title = "Unable to load this page",
  message = "There was a problem loading the content. Please try again.",
}: PageErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {reset && (
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Reload page
          </button>
        </div>
        {process.env.NODE_ENV === "development" && error && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
              Error details (dev only)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40">
              {error.message}
              {"\n\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function QueryErrorFallback({
  error,
  refetch,
  title = "Failed to load data",
  message = "We couldn't fetch the requested data. Please check your connection and try again.",
}: {
  error?: Error | null;
  refetch?: () => void;
  title?: string;
  message?: string;
}) {
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
