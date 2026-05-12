// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PageErrorFallback, QueryErrorFallback } from "./ErrorBoundary";

describe("PageErrorFallback", () => {
  it("renders the BrandedErrorScreen for the default area", () => {
    render(<PageErrorFallback />);
    expect(screen.getByText(/We hit a snag in Annix Rep/)).toBeInTheDocument();
  });

  it("ignores legacy title/message props and renders the branded screen for the configured area", () => {
    render(
      <PageErrorFallback title="Custom Title" message="Custom message text" area="Quotations" />,
    );
    expect(screen.getByText(/We hit a snag in Quotations/)).toBeInTheDocument();
    expect(screen.queryByText("Custom Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom message text")).not.toBeInTheDocument();
  });

  it("renders the Try again button when reset is provided", () => {
    const reset = vi.fn();
    render(<PageErrorFallback reset={reset} />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders the Try again button even without reset (falls back to window.location.reload)", () => {
    render(<PageErrorFallback />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls reset when the Try again button is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<PageErrorFallback reset={reset} />);
    await user.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("QueryErrorFallback", () => {
  it("should render default title and message", () => {
    render(<QueryErrorFallback />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't fetch the requested data. Please check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("should render custom title and message", () => {
    render(<QueryErrorFallback title="Network Error" message="Something failed" />);
    expect(screen.getByText("Network Error")).toBeInTheDocument();
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("should show retry button when refetch is provided", () => {
    const refetch = vi.fn();
    render(<QueryErrorFallback refetch={refetch} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should hide retry button when no refetch is provided", () => {
    render(<QueryErrorFallback />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("should call refetch when retry button is clicked", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    render(<QueryErrorFallback refetch={refetch} />);
    await user.click(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
