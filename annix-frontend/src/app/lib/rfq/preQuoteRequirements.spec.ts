import { describe, expect, it } from "vitest";
import type { PipeItem } from "@/app/lib/hooks/useRfqForm";
import { detectClarificationRequirements, pricingRequiresDrawing } from "./preQuoteRequirements";

const straightPipe = (overrides: Record<string, unknown> = {}): PipeItem =>
  ({
    id: "id-1",
    itemType: "straight_pipe",
    description: "",
    specs: { quantityValue: 1, quantityType: "number_of_items" },
    ...overrides,
  }) as unknown as PipeItem;

describe("pricingRequiresDrawing", () => {
  it("returns false when description is empty", () => {
    expect(pricingRequiresDrawing(straightPipe({ description: "" }))).toBe(false);
  });

  it("returns false for a straight pipe priceable from text", () => {
    const item = straightPipe({
      description:
        "DN 950 mild steel pipe (SABS 719 Grade C) - 6mm wall thickness, flanged to SABS 1123 Table 1000/3. 5.4m pipe length complete with stub-ons as detailed on Dwg J528-303-110",
    });
    expect(pricingRequiresDrawing(item)).toBe(false);
  });

  it("returns false for rubber-lined straight pipe with per-metre flanging", () => {
    const item = straightPipe({
      description:
        "DN 450 rubber-lined mild steel pipes to SANS 719 Grade B. 8mm wall thickness, rubber lining thickness of 6 mm. Flanged every 9.144 m to SANS 1123 Table 4000/3 (FF). Refer to Dwg J528-302-110.",
    });
    expect(pricingRequiresDrawing(item)).toBe(false);
  });

  it("returns true for a cast-in puddle pipe", () => {
    const item = straightPipe({
      description:
        "d) Cast in DN 200 HDPE puddle pipe (AL-2) including c/w puddle flange and backing flange as detailed on Dwg J528-303-110",
    });
    expect(pricingRequiresDrawing(item)).toBe(true);
  });

  it("returns true for a fabricated spool", () => {
    const item = straightPipe({
      description: "Fabricated spool to layout — refer Dwg J528-303-200",
    });
    expect(pricingRequiresDrawing(item)).toBe(true);
  });

  it("returns true for a manifold header", () => {
    const item = straightPipe({
      description: "DN 600 header pipe with branch connections per layout drawing",
    });
    expect(pricingRequiresDrawing(item)).toBe(true);
  });

  it("returns true for civil items (manhole, wash plate, thrust block)", () => {
    expect(
      pricingRequiresDrawing(
        straightPipe({ description: "Manhole bend assembly as shown on Dwg J528-303-300" }),
      ),
    ).toBe(true);
    expect(
      pricingRequiresDrawing(straightPipe({ description: "Wash plate fabricated to site layout" })),
    ).toBe(true);
    expect(pricingRequiresDrawing(straightPipe({ description: "Thrust block assembly" }))).toBe(
      true,
    );
  });

  it("is case-insensitive on keyword match", () => {
    expect(pricingRequiresDrawing(straightPipe({ description: "CAST IN puddle pipe" }))).toBe(true);
    expect(pricingRequiresDrawing(straightPipe({ description: "cast-in DN 100 piece" }))).toBe(
      true,
    );
  });
});

describe("detectClarificationRequirements", () => {
  it("still reports the drawing reference but does NOT flag a straight pipe for omission", () => {
    const items = [
      straightPipe({
        id: "row-1",
        description:
          "DN 950 mild steel pipe (SABS 719 Grade C) - 6mm wall thickness, flanged to SABS 1123 Table 1000/3. 5.4m pipe length complete with stub-ons as detailed on Dwg J528-303-110",
      }),
    ];

    const result = detectClarificationRequirements(items, [], undefined);

    expect(result.missingDrawings).toHaveLength(1);
    expect(result.missingDrawings[0]?.ref).toBe("J528-303-110");
    expect(result.flaggedItemIds.has("row-1")).toBe(false);
  });

  it("reports the drawing AND flags a cast-in puddle pipe for omission", () => {
    const items = [
      straightPipe({
        id: "row-cast",
        description:
          "d) Cast in DN 200 HDPE puddle pipe (AL-2) including c/w puddle flange and backing flange as detailed on Dwg J528-303-110",
      }),
    ];

    const result = detectClarificationRequirements(items, [], undefined);

    expect(result.missingDrawings).toHaveLength(1);
    expect(result.flaggedItemIds.has("row-cast")).toBe(true);
  });

  it("groups multiple items under the same drawing ref but flags only the fab items", () => {
    const items = [
      straightPipe({
        id: "row-pipe",
        clientItemNumber: "1.1",
        description:
          "DN 450 mild steel pipe, 8mm WT, flanged to SANS 1123 4000/3. Refer Dwg J528-303-110",
      }),
      straightPipe({
        id: "row-cast",
        clientItemNumber: "1.2",
        description: "Cast in DN 200 HDPE puddle pipe as detailed on Dwg J528-303-110",
      }),
    ];

    const result = detectClarificationRequirements(items, [], undefined);

    expect(result.missingDrawings).toHaveLength(1);
    expect(result.missingDrawings[0]?.itemNumbers).toEqual(["1.1", "1.2"]);
    expect(result.flaggedItemIds.has("row-pipe")).toBe(false);
    expect(result.flaggedItemIds.has("row-cast")).toBe(true);
  });

  it("does not report drawings that are already covered by an uploaded filename", () => {
    const items = [
      straightPipe({
        id: "row-cast",
        description: "Cast in DN 200 HDPE puddle pipe as detailed on Dwg J528-303-110",
      }),
    ];

    const result = detectClarificationRequirements(items, ["Drawings_J528-303-110.pdf"], undefined);

    expect(result.missingDrawings).toHaveLength(0);
    expect(result.flaggedItemIds.has("row-cast")).toBe(false);
  });

  it("does not report drawings already linked by a previous extraction", () => {
    const linkedItem = straightPipe({
      id: "row-linked",
      description: "Plain row",
      specs: {
        quantityValue: 1,
        quantityType: "number_of_items",
        drawingReference: "J528-303-110",
      },
    });
    const items: PipeItem[] = [
      linkedItem,
      straightPipe({
        id: "row-cast",
        description: "Cast in DN 200 HDPE puddle pipe as detailed on Dwg J528-303-110",
      }),
    ];

    const result = detectClarificationRequirements(items, [], undefined);

    expect(result.missingDrawings).toHaveLength(0);
    expect(result.flaggedItemIds.has("row-cast")).toBe(false);
  });

  it("returns empty results for items with no drawing references", () => {
    const result = detectClarificationRequirements(
      [straightPipe({ id: "row-x", description: "DN 100 pipe" })],
      [],
      undefined,
    );
    expect(result.missingDrawings).toHaveLength(0);
    expect(result.flaggedItemIds.size).toBe(0);
  });
});
