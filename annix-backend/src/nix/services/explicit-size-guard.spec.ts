import { enforceExplicitDescriptionSpecs, explicitNominalBoresIn } from "./explicit-size-guard";

const item = (overrides: Partial<Parameters<typeof enforceExplicitDescriptionSpecs>[0]>) => ({
  description: "DN 450 rubber lined mild steel pipe",
  diameter: 450,
  diameterUnit: "mm" as const,
  material: "Mild Steel",
  ...overrides,
});

describe("explicit-size-guard (issue #294)", () => {
  describe("explicitNominalBoresIn", () => {
    it("reads DN, NB and mm-diameter conventions in order of appearance", () => {
      expect(explicitNominalBoresIn("DN 100 flexible spigot pipes")).toEqual([100]);
      expect(explicitNominalBoresIn("450NB rubber lined pipe")).toEqual([450]);
      expect(explicitNominalBoresIn("pipe 100 mm diameter")).toEqual([100]);
      expect(explicitNominalBoresIn("NB 200 steel pipe")).toEqual([200]);
      expect(explicitNominalBoresIn("Ø350 pipe spool")).toEqual([350]);
    });

    it("keeps multiple sizes in description order", () => {
      expect(
        explicitNominalBoresIn(
          "DN 450 rubber-lined mild steel pipes with two DN 100 spigot offtakes",
        ),
      ).toEqual([450, 100]);
    });

    it("ignores out-of-range numbers and sizeless text", () => {
      expect(explicitNominalBoresIn("DN 9999 pipe")).toEqual([]);
      expect(explicitNominalBoresIn("rubber slurry hose, 15473 m")).toEqual([]);
    });
  });

  describe("enforceExplicitDescriptionSpecs", () => {
    it("overrides an inherited parent NB with the sub-item's own explicit size", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({
          description: "DN 100 flexible spigot pipes (rubber slurry hose)",
          diameter: 450,
        }),
      );
      expect(result.item.diameter).toBe(100);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it("replaces inherited steel with the description's hose phrase", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({
          description: "DN 100 flexible spigot pipes (rubber slurry hose)",
          diameter: 450,
          material: "Mild Steel",
        }),
      );
      expect(result.item.material?.toLowerCase()).toBe("rubber slurry hose");
    });

    it("leaves the parent row alone when its diameter matches any stated size", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({
          description: "DN 450 rubber-lined mild steel pipes with two DN 100 spigot offtakes",
          diameter: 450,
        }),
      );
      expect(result.item.diameter).toBe(450);
      expect(result.item.material).toBe("Mild Steel");
      expect(result.corrections).toEqual([]);
    });

    it("fills a missing diameter from an explicit description size", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({ description: "DN 200 steel pipe", diameter: null }),
      );
      expect(result.item.diameter).toBe(200);
    });

    it("does not touch rows whose description states no size", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({ description: "Concentric reducer 200x150", diameter: 200 }),
      );
      expect(result.item.diameter).toBe(200);
      expect(result.corrections).toEqual([]);
    });

    it("does not flag rubber-lined steel as hose", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({ description: "DN 450 rubber lined mild steel pipe", diameter: 450 }),
      );
      expect(result.item.material).toBe("Mild Steel");
    });

    it("skips inch-denominated rows entirely", () => {
      const result = enforceExplicitDescriptionSpecs(
        item({ description: "DN 100 pipe", diameter: 4, diameterUnit: "inch" }),
      );
      expect(result.item.diameter).toBe(4);
      expect(result.corrections).toEqual([]);
    });
  });
});
