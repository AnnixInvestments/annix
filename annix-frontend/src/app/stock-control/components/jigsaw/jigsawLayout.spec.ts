import { describe, expect, it } from "vitest";
import {
  canSplitPanel,
  DEFAULT_TANK_LINING_OVERLAP_MM,
  MIN_SPLIT_SIDE_MM,
  panelsFromTankComponents,
  panelsFromTankPlateBom,
  SPLIT_SEAM_OVERLAP_MM,
  serializeToManualRolls,
  splitPanelInHalf,
  type TankComponentSource,
  type TankPanelSource,
  unplacedAfterRestore,
} from "./jigsawLayout";
import type { JigsawPanel, JigsawRoll, PlacedPanel } from "./jigsawTypes";

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

  it("clamps an absurd plate quantity so it cannot OOM the browser", () => {
    const panels = panelsFromTankPlateBom([
      tank([{ mark: "1", lengthMm: 500, widthMm: 500, quantity: 5_000_000, liningThicknessMm: 6 }]),
    ]);
    expect(panels).toHaveLength(1000);
  });

  it("returns nothing for an empty tank list", () => {
    expect(panelsFromTankPlateBom([])).toEqual([]);
  });
});

const componentTank = (
  components: TankComponentSource["components"],
  over: Partial<TankComponentSource> = {},
): TankComponentSource => ({
  itemId: "T1",
  itemNo: "A.1",
  tankName: "Duplex Tank",
  components,
  ...over,
});

describe("panelsFromTankComponents", () => {
  it("unrolls a cylindrical shell to a circumference x height rectangle + overlap", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "S1",
          shape: { type: "cylinder", innerDiameterMm: 1000, heightMm: 1200 },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.lengthMm).toBeCloseTo(Math.PI * 1000 + DEFAULT_TANK_LINING_OVERLAP_MM, 1);
    expect(p.widthMm).toBe(1200 + DEFAULT_TANK_LINING_OVERLAP_MM);
    expect(p.shape).toBeUndefined();
    expect(p.dimensionContext.liningThicknessMm).toBe(6);
  });

  it("develops a cone into an annular sector outline", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "C1",
          shape: {
            type: "cone",
            largeDiameterMm: 600,
            smallDiameterMm: 300,
            slantHeightMm: 400,
            sweepAngleDegrees: null,
          },
          liningThicknessMm: 10,
        },
      ]),
    ]);
    expect(p.shape?.type).toBe("annular_sector");
    if (p.shape?.type === "annular_sector") {
      expect(p.shape.sweepAngleDegrees).toBeGreaterThan(0);
      expect(p.shape.outerRadiusMm).toBeGreaterThan(p.shape.innerRadiusMm);
    }
    expect(p.lengthMm).toBeGreaterThan(DEFAULT_TANK_LINING_OVERLAP_MM);
    expect(p.widthMm).toBeGreaterThan(DEFAULT_TANK_LINING_OVERLAP_MM);
  });

  it("represents a dished head as a circle blank", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "LID",
          shape: {
            type: "dished_head",
            outerDiameterMm: 750,
            crownRadiusMm: 642,
            knuckleRadiusMm: 45,
          },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.shape).toEqual({ type: "circle", radiusMm: 375 });
    expect(p.lengthMm).toBe(750 + DEFAULT_TANK_LINING_OVERLAP_MM);
    expect(p.widthMm).toBe(750 + DEFAULT_TANK_LINING_OVERLAP_MM);
  });

  it("represents an annular ring as an annulus", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "RING",
          shape: { type: "annular_ring", outerDiameterMm: 1100, innerDiameterMm: 1000 },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.shape).toEqual({ type: "annulus", innerRadiusMm: 500, outerRadiusMm: 550 });
  });

  it("unrolls a branch wrap to a circumference x length rectangle", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "ARM",
          shape: { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355 },
          liningThicknessMm: 6,
          quantity: 10,
        },
      ]),
    ]);
    expect(p.shape).toBeUndefined();
    expect(p.lengthMm).toBeCloseTo(Math.PI * 200 + DEFAULT_TANK_LINING_OVERLAP_MM, 1);
    expect(p.widthMm).toBe(355 + DEFAULT_TANK_LINING_OVERLAP_MM);
  });

  it("quantity-expands components into one panel per instance with unique ids", () => {
    const panels = panelsFromTankComponents([
      componentTank([
        {
          mark: "ARM",
          shape: { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355 },
          liningThicknessMm: 6,
          quantity: 10,
        },
      ]),
    ]);
    expect(panels).toHaveLength(10);
    expect(new Set(panels.map((p) => p.panelId)).size).toBe(10);
  });

  it("skips unlined and undimensioned components", () => {
    const panels = panelsFromTankComponents([
      componentTank([
        {
          mark: "leg",
          shape: { type: "cylinder", innerDiameterMm: 100, heightMm: 500 },
          liningThicknessMm: 0,
        },
        {
          mark: "bad",
          shape: { type: "cylinder", innerDiameterMm: 0, heightMm: 0 },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(panels).toHaveLength(0);
  });

  it("returns nothing for an empty component source list", () => {
    expect(panelsFromTankComponents([])).toEqual([]);
  });

  it("clamps an absurd quantity so it cannot OOM the browser", () => {
    const panels = panelsFromTankComponents([
      componentTank([
        {
          mark: "ARM",
          shape: { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355 },
          liningThicknessMm: 6,
          quantity: 1_000_000_000,
        },
      ]),
    ]);
    expect(panels).toHaveLength(1000);
  });

  it("treats a non-finite quantity as a single panel", () => {
    const panels = panelsFromTankComponents([
      componentTank([
        {
          mark: "ARM",
          shape: { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355 },
          liningThicknessMm: 6,
          quantity: Number.POSITIVE_INFINITY,
        },
      ]),
    ]);
    expect(panels).toHaveLength(1);
  });
});

const jigsawPanel = (over: Partial<JigsawPanel> = {}): JigsawPanel => ({
  panelId: "T1-1",
  itemId: "T1",
  itemNo: "A.1",
  description: "Underflow Tank — Mark 1 (6mm R/L)",
  widthMm: 1400,
  lengthMm: 3000,
  originalWidthMm: 1400,
  originalLengthMm: 3000,
  rotated: false,
  colorIndex: 0,
  dimensionContext: {
    nbMm: null,
    odMm: null,
    schedule: null,
    lengthMm: 3000,
    flangeConfig: null,
    itemType: "tank_chute",
    liningThicknessMm: 6,
  },
  ...over,
});

describe("splitPanelInHalf", () => {
  it("splits along the longer side into two halves with a seam overlap", () => {
    const halves = splitPanelInHalf(jigsawPanel({ widthMm: 1400, lengthMm: 3000 }));
    expect(halves).not.toBeNull();
    const [a, b] = halves!;
    expect(a.lengthMm).toBe(1500 + SPLIT_SEAM_OVERLAP_MM);
    expect(a.widthMm).toBe(1400);
    expect(b.lengthMm).toBe(1500 + SPLIT_SEAM_OVERLAP_MM);
    expect(b.widthMm).toBe(1400);
  });

  it("splits along width when the panel is wider than long", () => {
    const [a] = splitPanelInHalf(jigsawPanel({ widthMm: 3000, lengthMm: 800 }))!;
    expect(a.widthMm).toBe(1500 + SPLIT_SEAM_OVERLAP_MM);
    expect(a.lengthMm).toBe(800);
  });

  it("gives the halves unique ids, distinct labels and resets rotation/shape", () => {
    const [a, b] = splitPanelInHalf(
      jigsawPanel({ rotated: true, shape: { type: "circle", radiusMm: 375 } }),
    )!;
    expect(a.panelId).not.toBe(b.panelId);
    expect(a.panelId).toBe("T1-1-s1");
    expect(b.panelId).toBe("T1-1-s2");
    expect(a.itemNo).toContain("cut A");
    expect(b.itemNo).toContain("cut B");
    expect(a.rotated).toBe(false);
    expect(a.shape).toBeUndefined();
  });

  it("resets each half's original dims to its own size (not flagged as an override)", () => {
    const [a] = splitPanelInHalf(jigsawPanel())!;
    expect(a.originalWidthMm).toBe(a.widthMm);
    expect(a.originalLengthMm).toBe(a.lengthMm);
  });

  it("can split a half again into quarters", () => {
    const [a] = splitPanelInHalf(jigsawPanel({ widthMm: 1400, lengthMm: 3000 }))!;
    const quarters = splitPanelInHalf(a);
    expect(quarters).not.toBeNull();
    expect(quarters![0].panelId).toBe("T1-1-s1-s1");
  });

  it("refuses to split a panel below the minimum size", () => {
    const tiny = jigsawPanel({ widthMm: 100, lengthMm: 150 });
    expect(canSplitPanel(tiny)).toBe(false);
    expect(splitPanelInHalf(tiny)).toBeNull();
  });

  it("never produces a half longer than the source, even at the minimum splittable size", () => {
    const atMin = jigsawPanel({ widthMm: 100, lengthMm: MIN_SPLIT_SIDE_MM });
    const halves = splitPanelInHalf(atMin);
    expect(halves).not.toBeNull();
    const [a, b] = halves!;
    expect(a.lengthMm).toBeLessThan(atMin.lengthMm);
    expect(b.lengthMm).toBeLessThan(atMin.lengthMm);
    expect(Math.max(a.widthMm, a.lengthMm)).toBeLessThan(Math.max(atMin.widthMm, atMin.lengthMm));
  });

  it("recursively splits into four quarters with unique ids, each smaller than the original", () => {
    const original = jigsawPanel({ widthMm: 1400, lengthMm: 3000 });
    const [h1, h2] = splitPanelInHalf(original)!;
    const [q1, q2] = splitPanelInHalf(h1)!;
    const [q3, q4] = splitPanelInHalf(h2)!;
    const ids = [q1, q2, q3, q4].map((q) => q.panelId);
    expect(new Set(ids).size).toBe(4);
    [q1, q2, q3, q4].forEach((q) => {
      expect(Math.max(q.widthMm, q.lengthMm)).toBeLessThanOrEqual(
        Math.max(original.widthMm, original.lengthMm),
      );
      expect(q.shape).toBeUndefined();
      expect(q.rotated).toBe(false);
    });
  });

  it("splits a square panel along its length", () => {
    const square = jigsawPanel({ widthMm: 1000, lengthMm: 1000 });
    const [a] = splitPanelInHalf(square)!;
    expect(a.lengthMm).toBe(500 + SPLIT_SEAM_OVERLAP_MM);
    expect(a.widthMm).toBe(1000);
  });
});

describe("developTankComponent geometry edge cases (via panelsFromTankComponents)", () => {
  it("treats a cone whose ends are ~equal as a plain cylinder rectangle (no curved outline)", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "C-EQ",
          shape: {
            type: "cone",
            largeDiameterMm: 600,
            smallDiameterMm: 600,
            slantHeightMm: 400,
            sweepAngleDegrees: null,
          },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.shape).toBeUndefined();
    expect(p.lengthMm).toBeCloseTo(Math.PI * 600 + DEFAULT_TANK_LINING_OVERLAP_MM, 1);
    expect(p.widthMm).toBe(400 + DEFAULT_TANK_LINING_OVERLAP_MM);
  });

  it("does not crash and yields finite dims when slant < deltaRadius (impossible cone)", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "C-BAD",
          shape: {
            type: "cone",
            largeDiameterMm: 1000,
            smallDiameterMm: 0,
            slantHeightMm: 100,
            sweepAngleDegrees: null,
          },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(Number.isFinite(p.lengthMm)).toBe(true);
    expect(Number.isFinite(p.widthMm)).toBe(true);
    expect(p.lengthMm).toBeGreaterThan(0);
    expect(p.widthMm).toBeGreaterThan(0);
  });

  it("clamps an annular ring whose inner diameter exceeds the outer (innerRadius <= outerRadius)", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "RING-BAD",
          shape: { type: "annular_ring", outerDiameterMm: 1000, innerDiameterMm: 1500 },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.shape?.type).toBe("annulus");
    if (p.shape?.type === "annulus") {
      expect(p.shape.innerRadiusMm).toBeLessThanOrEqual(p.shape.outerRadiusMm);
    }
  });

  // Tank apex / floor cones routinely develop PAST 180° (e.g. 1450/450/805 →
  // 223.6°). developFrustum must then size the panel to the full developed width
  // (2·R), not the half-angle chord — otherwise the cutter gets a panel too small.
  it("sizes a >180° tank-cone panel to cover the full developed width (2·R)", () => {
    const [p] = panelsFromTankComponents([
      componentTank([
        {
          mark: "C1",
          shape: {
            type: "cone",
            largeDiameterMm: 1450,
            smallDiameterMm: 450,
            slantHeightMm: 805,
            sweepAngleDegrees: null,
          },
          liningThicknessMm: 6,
        },
      ]),
    ]);
    expect(p.shape?.type).toBe("annular_sector");
    if (p.shape?.type === "annular_sector") {
      expect(p.shape.sweepAngleDegrees).toBeGreaterThan(180);
      expect(p.widthMm - DEFAULT_TANK_LINING_OVERLAP_MM).toBeGreaterThanOrEqual(
        2 * p.shape.outerRadiusMm - 1,
      );
    }
  });
});

const placed = (over: Partial<PlacedPanel> = {}): PlacedPanel => ({
  ...jigsawPanel(),
  rollIndex: 0,
  xMm: 0,
  yMm: 0,
  ...over,
});

describe("serializeToManualRolls round-trip", () => {
  const roll: JigsawRoll = { widthMm: 1400, lengthMm: 12500, thicknessMm: 6 };

  it("merges identical split halves into one cut with quantity, keeping A/B distinct", () => {
    const halfA1 = placed({
      panelId: "T1-1-s1",
      description: "Tank — Mark 1 [cut A]",
      widthMm: 1400,
      lengthMm: 800,
      shape: undefined,
    });
    const halfA2 = placed({
      panelId: "T1-2-s1",
      description: "Tank — Mark 1 [cut A]",
      widthMm: 1400,
      lengthMm: 800,
      shape: undefined,
    });
    const halfB1 = placed({
      panelId: "T1-1-s2",
      description: "Tank — Mark 1 [cut B]",
      widthMm: 1400,
      lengthMm: 800,
      shape: undefined,
    });

    const [serialized] = serializeToManualRolls([roll], [halfA1, halfA2, halfB1]);
    const cutA = serialized.cuts.find((c) => c.description.includes("cut A"));
    const cutB = serialized.cuts.find((c) => c.description.includes("cut B"));
    expect(cutA?.quantity).toBe(2);
    expect(cutB?.quantity).toBe(1);
  });

  it("preserves a non-rectangular panel shape through serialization", () => {
    const disc = placed({
      panelId: "T1-c-LID-0",
      description: "Tank — Dished lid (6mm R/L)",
      widthMm: 800,
      lengthMm: 800,
      shape: { type: "circle", radiusMm: 375 },
    });
    const [serialized] = serializeToManualRolls([roll], [disc]);
    expect(serialized.cuts).toHaveLength(1);
    expect(serialized.cuts[0].shape).toEqual({ type: "circle", radiusMm: 375 });
  });

  it("serializes a rotated panel by its effective (on-roll) dimensions", () => {
    const rotatedPanel = placed({
      panelId: "T1-1",
      widthMm: 600,
      lengthMm: 1200,
      rotated: true,
    });
    const [serialized] = serializeToManualRolls([roll], [rotatedPanel]);
    // effective width = lengthMm when rotated, effective length = widthMm
    expect(serialized.cuts[0].widthMm).toBe(1200);
    expect(serialized.cuts[0].lengthMm).toBe(600);
  });
});

describe("unplacedAfterRestore", () => {
  it("removes a placed panel from the tray", () => {
    const all = [jigsawPanel({ panelId: "A" }), jigsawPanel({ panelId: "B" })];
    const result = unplacedAfterRestore(all, [{ panelId: "A" }]);
    expect(result.map((p) => p.panelId)).toEqual(["B"]);
  });

  it("removes a split parent when a split sibling is placed", () => {
    const all = [jigsawPanel({ panelId: "A" }), jigsawPanel({ panelId: "B" })];
    const result = unplacedAfterRestore(all, [{ panelId: "A-s1" }, { panelId: "A-s2" }]);
    expect(result.map((p) => p.panelId)).toEqual(["B"]);
  });

  it("keeps panels that are neither placed nor split", () => {
    const all = [jigsawPanel({ panelId: "A" }), jigsawPanel({ panelId: "B" })];
    const result = unplacedAfterRestore(all, [{ panelId: "C" }]);
    expect(result.map((p) => p.panelId)).toEqual(["A", "B"]);
  });

  it("does not treat a sub-panel label starting with 's' as a split", () => {
    const all = [jigsawPanel({ panelId: "A" })];
    const result = unplacedAfterRestore(all, [{ panelId: "A-side" }]);
    expect(result.map((p) => p.panelId)).toEqual(["A"]);
  });

  it("does not over-match a longer base id (A vs A2)", () => {
    const all = [jigsawPanel({ panelId: "A2" })];
    const result = unplacedAfterRestore(all, [{ panelId: "A-s1" }]);
    expect(result.map((p) => p.panelId)).toEqual(["A2"]);
  });

  it("returns all panels when there are no placements", () => {
    const all = [jigsawPanel({ panelId: "A" })];
    expect(unplacedAfterRestore(all, [])).toHaveLength(1);
  });
});
