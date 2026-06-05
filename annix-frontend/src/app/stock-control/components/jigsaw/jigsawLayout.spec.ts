import { describe, expect, it } from "vitest";
import {
  DEFAULT_TANK_LINING_OVERLAP_MM,
  panelsFromTankPlateBom,
  type TankPanelSource,
} from "./jigsawLayout";

const tank = (
  plates: TankPanelSource["plates"],
  over: Partial<TankPanelSource> = {},
): TankPanelSource => ({
  itemId: "T1",
  itemNo: "A.1",
  tankName: "Underflow Tank",
  plates,
  ...over,
});

describe("panelsFromTankPlateBom", () => {
  it("turns a lined plate into a panel sized to developed area + overlap", () => {
    const panels = panelsFromTankPlateBom([
      tank([{ mark: "1", lengthMm: 1000, widthMm: 500, quantity: 1, liningThicknessMm: 6 }]),
    ]);
    expect(panels).toHaveLength(1);
    const p = panels[0];
    expect(p.lengthMm).toBe(1000 + DEFAULT_TANK_LINING_OVERLAP_MM);
    expect(p.widthMm).toBe(500 + DEFAULT_TANK_LINING_OVERLAP_MM);
    expect(p.originalLengthMm).toBe(p.lengthMm);
    expect(p.originalWidthMm).toBe(p.widthMm);
    expect(p.rotated).toBe(false);
  });

  it("carries the per-plate lining thickness + tank itemType in the dimension context", () => {
    const [p] = panelsFromTankPlateBom([
      tank([{ mark: "2", lengthMm: 800, widthMm: 400, quantity: 1, liningThicknessMm: 10 }]),
    ]);
    expect(p.dimensionContext.liningThicknessMm).toBe(10);
    expect(p.dimensionContext.itemType).toBe("tank_chute");
    expect(p.dimensionContext.nbMm).toBeNull();
  });

  it("expands quantity into one panel per instance with unique ids", () => {
    const panels = panelsFromTankPlateBom([
      tank([{ mark: "3", lengthMm: 600, widthMm: 300, quantity: 4, liningThicknessMm: 6 }]),
    ]);
    expect(panels).toHaveLength(4);
    expect(new Set(panels.map((p) => p.panelId)).size).toBe(4);
    panels.forEach((p) => expect(p.itemId).toBe("T1"));
  });

  it("skips unlined plates (no lining thickness)", () => {
    const panels = panelsFromTankPlateBom([
      tank([
        { mark: "lug", lengthMm: 100, widthMm: 50, quantity: 2, liningThicknessMm: 0 },
        { mark: "gusset", lengthMm: 100, widthMm: 50, quantity: 2 },
      ]),
    ]);
    expect(panels).toHaveLength(0);
  });

  it("skips plates missing a developed length or width", () => {
    const panels = panelsFromTankPlateBom([
      tank([
        { mark: "a", lengthMm: 0, widthMm: 500, quantity: 1, liningThicknessMm: 6 },
        { mark: "b", lengthMm: 500, widthMm: 0, quantity: 1, liningThicknessMm: 6 },
        { mark: "c", quantity: 1, liningThicknessMm: 6 },
      ]),
    ]);
    expect(panels).toHaveLength(0);
  });

  it("defaults a missing/zero quantity to one panel", () => {
    const panels = panelsFromTankPlateBom([
      tank([{ mark: "x", lengthMm: 500, widthMm: 500, liningThicknessMm: 6 }]),
    ]);
    expect(panels).toHaveLength(1);
  });

  it("flat-maps multiple tanks and keeps their ids distinct", () => {
    const panels = panelsFromTankPlateBom([
      tank([{ mark: "1", lengthMm: 500, widthMm: 500, quantity: 1, liningThicknessMm: 6 }], {
        itemId: "T1",
      }),
      tank([{ mark: "1", lengthMm: 700, widthMm: 300, quantity: 1, liningThicknessMm: 10 }], {
        itemId: "T2",
        tankName: "Overflow Tank",
      }),
    ]);
    expect(panels).toHaveLength(2);
    expect(panels.map((p) => p.itemId).sort()).toEqual(["T1", "T2"]);
  });

  it("respects a custom overlap allowance", () => {
    const [p] = panelsFromTankPlateBom(
      [tank([{ mark: "1", lengthMm: 1000, widthMm: 500, quantity: 1, liningThicknessMm: 6 }])],
      100,
    );
    expect(p.lengthMm).toBe(1100);
    expect(p.widthMm).toBe(600);
  });

  it("labels the panel with tank name, mark and the lining thickness", () => {
    const [p] = panelsFromTankPlateBom([
      tank([{ mark: "7", lengthMm: 500, widthMm: 500, quantity: 1, liningThicknessMm: 6 }]),
    ]);
    expect(p.description).toContain("Underflow Tank");
    expect(p.description).toContain("Mark 7");
    expect(p.description).toContain("6mm R/L");
    expect(p.itemNo).toBe("A.1");
  });

  it("returns nothing for an empty tank list", () => {
    expect(panelsFromTankPlateBom([])).toEqual([]);
  });
});
