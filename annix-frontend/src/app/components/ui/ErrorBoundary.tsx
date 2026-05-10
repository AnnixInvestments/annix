"use client";

import { Component, type ReactNode } from "react";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Human label of the area for the user-facing error screen — shown as
   * 'We hit a snag in {area}.' Defaults to 'this section'.
   */
  area?: string;
  /** Where the 'Back' button should link. Defaults to '/'. */
  backHref?: string;
  backLabel?: string;
  brandButtonClass?: string;
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

    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      if (!error) return null;

      const area = this.props.area ? this.props.area : "this section";
      const backHref = this.props.backHref ? this.props.backHref : "/";
      const backLabel = this.props.backLabel;
      const brandButtonClass = this.props.brandButtonClass;

      return (
        <BrandedErrorScreen
          area={area}
          error={error}
          reset={this.handleReset}
          backHref={backHref}
          backLabel={backLabel}
          brandButtonClass={brandButtonClass}
        />
      );
    }

    return this.props.children;
  }
}
