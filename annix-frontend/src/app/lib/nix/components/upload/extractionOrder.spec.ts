import { describe, expect, it } from "vitest";
import { extractionPassesOf, orderForExtraction } from "./extractionOrder";

const doc = (id: string, role: "drawing" | "specification" | "other") => ({ id, role });

describe("extraction pass ordering (issue #266 Phase 2)", () => {
  it("orders drawings before specifications before other regardless of drop order", () => {
    const mixed = [
      doc("spec1", "specification"),
      doc("word1", "other"),
      doc("drw1", "drawing"),
      doc("spec2", "specification"),
      doc("drw2", "drawing"),
    ];
    expect(orderForExtraction(mixed).map((d) => d.id)).toEqual([
      "drw1",
      "drw2",
      "spec1",
      "spec2",
      "word1",
    ]);
  });

  it("omits empty passes", () => {
    const passes = extractionPassesOf([doc("a", "specification")]);
    expect(passes).toHaveLength(1);
    expect(passes[0].role).toBe("specification");
  });

  it("preserves drop order within a pass", () => {
    const passes = extractionPassesOf([
      doc("z", "drawing"),
      doc("a", "drawing"),
      doc("m", "drawing"),
    ]);
    expect(passes[0].documents.map((d) => d.id)).toEqual(["z", "a", "m"]);
  });

  it("handles the empty list", () => {
    expect(extractionPassesOf([])).toEqual([]);
    expect(orderForExtraction([])).toEqual([]);
  });
});
