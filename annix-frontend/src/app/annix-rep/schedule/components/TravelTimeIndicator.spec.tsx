// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TravelTimeConnector, TravelTimeIndicator } from "./TravelTimeIndicator";

describe("TravelTimeIndicator", () => {
  it("should render travel duration text", () => {
    render(<TravelTimeIndicator travelInfo={{ estimatedMinutes: 25, distanceKm: 18 }} />);
    expect(screen.getByText("25 min travel")).toBeInTheDocument();
    expect(screen.getByText("18 km")).toBeInTheDocument();
  });

  it("should render compact variant with abbreviated text", () => {
    render(
      <TravelTimeIndicator travelInfo={{ estimatedMinutes: 10, distanceKm: 5 }} compact={true} />,
    );
    expect(screen.getByText("10 min")).toBeInTheDocument();
    expect(screen.queryByText("5 km")).not.toBeInTheDocument();
  });

  it("should apply green color classes for short travel times", () => {
    const { container } = render(
      <TravelTimeIndicator travelInfo={{ estimatedMinutes: 10, distanceKm: 5 }} />,
    );
    const indicator = container.querySelector(".bg-green-50");
    expect(indicator).toBeInTheDocument();
  });

  it("should apply yellow color classes for medium travel times", () => {
    const { container } = render(
      <TravelTimeIndicator travelInfo={{ estimatedMinutes: 20, distanceKm: 12 }} />,
    );
    const indicator = container.querySelector(".bg-yellow-50");
    expect(indicator).toBeInTheDocument();
  });

  it("should apply red color classes for long travel times", () => {
    const { container } = render(
      <TravelTimeIndicator travelInfo={{ estimatedMinutes: 45, distanceKm: 35 }} />,
    );
    const indicator = container.querySelector(".bg-red-50");
    expect(indicator).toBeInTheDocument();
  });
});

describe("TravelTimeConnector", () => {
  it("should render travel time and distance when travelInfo is provided", () => {
    render(<TravelTimeConnector travelInfo={{ estimatedMinutes: 30, distanceKm: 22 }} />);
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("(22 km)")).toBeInTheDocument();
  });

  it("should render a dashed connector when travelInfo is null", () => {
    const { container } = render(<TravelTimeConnector travelInfo={null} />);
    const dashedLine = container.querySelector(".border-dashed");
    expect(dashedLine).toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });
});
