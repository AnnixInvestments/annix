"use client";

import { Component, type ReactNode } from "react";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";

interface NixErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  /** Human label of the surface, shown as 'We hit a snag in {area}.'. */
  area?: string;
  /** Where the 'Back' button links. */
  backHref?: string;
  /** Tailwind class for the branded 'Try again' button. */
  brandButtonClass?: string;
}

interface NixErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class NixErrorBoundary extends Component<NixErrorBoundaryProps, NixErrorBoundaryState> {
  constructor(props: NixErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): NixErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("NixErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const caught = this.state.error;
      const error = caught ? caught : new Error("Unexpected error");
      const rawArea = this.props.area;
      const area = rawArea ? rawArea : "Nix";
      const rawBackHref = this.props.backHref;
      const backHref = rawBackHref ? rawBackHref : "/";

      return (
        <BrandedErrorScreen
          error={error}
          reset={this.handleReset}
          backHref={backHref}
          backLabel="Back"
          brandButtonClass={this.props.brandButtonClass}
          area={area}
        />
      );
    }

    return this.props.children;
  }
}
