// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState, Skeleton, SkeletonTable, SkeletonText } from "./Skeleton";

describe("Skeleton", () => {
  it("should render a div with animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.className).toContain("animate-pulse");
  });

  it("should apply custom className", () => {
    const { container } = render(<Skeleton className="h-10 w-10" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("h-10");
    expect(div.className).toContain("w-10");
  });
});

describe("SkeletonText", () => {
  it("should render 1 line by default", () => {
    const { container } = render(<SkeletonText />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements).toHaveLength(1);
  });

  it("should render the specified number of lines", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements).toHaveLength(3);
  });

  it("should apply custom className", () => {
    const { container } = render(<SkeletonText className="mt-4" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("mt-4");
  });
});

describe("SkeletonTable", () => {
  it("should render default 5 rows and 4 columns", () => {
    const { container } = render(<SkeletonTable />);
    const headerPulses = container.querySelector(".border-b")?.querySelectorAll(".animate-pulse");
    expect(headerPulses).toHaveLength(4);

    const bodyRows = container.querySelector(".divide-y")?.children;
    expect(bodyRows).toHaveLength(5);
  });

  it("should render custom rows and columns", () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />);
    const headerPulses = container.querySelector(".border-b")?.querySelectorAll(".animate-pulse");
    expect(headerPulses).toHaveLength(2);

    const bodyRows = container.querySelector(".divide-y")?.children;
    expect(bodyRows).toHaveLength(3);
  });

  it("should apply custom className", () => {
    const { container } = render(<SkeletonTable className="mt-6" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("mt-6");
  });
});

describe("LoadingState", () => {
  it("should show skeleton when isLoading is true", () => {
    const { container } = render(
      <LoadingState isLoading={true}>
        <span>Content</span>
      </LoadingState>,
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should show children when isLoading is false", () => {
    render(
      <LoadingState isLoading={false}>
        <span>Content</span>
      </LoadingState>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should apply custom className to loading wrapper", () => {
    const { container } = render(
      <LoadingState isLoading={true} className="p-4">
        <span>Content</span>
      </LoadingState>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("p-4");
  });
});
