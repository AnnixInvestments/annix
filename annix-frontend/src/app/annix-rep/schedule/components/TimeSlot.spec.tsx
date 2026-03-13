// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeSlot } from "./TimeSlot";

vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn(),
  })),
}));

describe("TimeSlot", () => {
  it("should render a droppable time slot element", () => {
    const { container } = render(<TimeSlot id="slot-08:00" time={new Date()} />);
    const slot = container.firstElementChild as HTMLElement;
    expect(slot).toBeInTheDocument();
    expect(slot.className).toContain("h-[60px]");
  });

  it("should apply default background class when not hovered", () => {
    const { container } = render(<TimeSlot id="slot-09:00" time={new Date()} />);
    const slot = container.firstElementChild as HTMLElement;
    expect(slot.className).toContain("bg-white");
  });

  it("should apply highlight class when isOver is true", async () => {
    const { useDroppable } = await import("@dnd-kit/core");
    vi.mocked(useDroppable).mockReturnValue({
      isOver: true,
      setNodeRef: vi.fn(),
      active: null,
      over: null,
      node: { current: null },
      rect: null as never,
    });

    const { container } = render(<TimeSlot id="slot-10:00" time={new Date()} />);
    const slot = container.firstElementChild as HTMLElement;
    expect(slot.className).toContain("bg-blue-50");
  });
});
