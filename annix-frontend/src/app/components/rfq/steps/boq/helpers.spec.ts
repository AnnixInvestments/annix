import { describe, expect, it } from "vitest";
import {
  bendCenterToFaceMm,
  consolidatedToRows,
  detectPipeVariant,
  filterByMaterial,
  flangeConfigSuffix,
  formatDate,
  formatQty,
  formatWeight,
  getFlangeCountFromConfig,
  getFlangeTypeName,
  getPhysicalFlangeCount,
  materialOfEntry,
  pipeVariantPrefix,
  safeFilename,
} from "./helpers";
import type { ConsolidatedItem } from "./types";

const EMPTY_SOURCE_CONTEXT = {
  hasAnySourceLocations: false,
  sourceLookup: new Map<string, string>(),
};

describe("formatDate", () => {
  it("returns 'Not specified' when date is undefined", () => {
    expect(formatDate(undefined)).toBe("Not specified");
  });

  it("returns 'Not specified' when date is empty string", () => {
    expect(formatDate("")).toBe("Not specified");
  });

  it("formats an ISO string via formatDateLongZA", () => {
    const result = formatDate("2026-05-10T08:00:00Z");
    // Africa/Johannesburg locale, long format — assert presence of year + month-name + day
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/May/);
  });

  it("formats a Date object via fromJSDate.toLocaleString", () => {
    // eslint-disable-next-line no-restricted-globals, no-restricted-syntax -- testing the Date branch of formatDate's signature
    const result = formatDate(new Date("2026-05-10T08:00:00Z"));
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/May/);
  });
});

describe("formatWeight", () => {
  it("returns '0.00 kg' for undefined", () => {
    expect(formatWeight(undefined)).toBe("0.00 kg");
  });

  it("returns '0.00 kg' for 0", () => {
    expect(formatWeight(0)).toBe("0.00 kg");
  });

  it("returns '0.00 kg' for NaN", () => {
    expect(formatWeight(Number.NaN)).toBe("0.00 kg");
  });

  it("formats positive weight to 2 dp with 'kg' suffix", () => {
    expect(formatWeight(123.456)).toBe("123.46 kg");
  });

  it("rounds half to even per toFixed", () => {
    expect(formatWeight(1.005)).toMatch(/^1\.\d{2} kg$/);
  });
});

describe("formatQty", () => {
  it("returns '0' for undefined", () => {
    expect(formatQty(undefined)).toBe("0");
  });

  it("returns '0' for null", () => {
    expect(formatQty(null as unknown as number)).toBe("0");
  });

  it("returns '0' for NaN", () => {
    expect(formatQty(Number.NaN)).toBe("0");
  });

  it("formats integer without decimals", () => {
    expect(formatQty(13257)).toBe("13257");
  });

  it("strips floating-point noise on near-integer", () => {
    // biome-ignore lint/correctness/noPrecisionLoss: literal demonstrates the IEEE-754 noise the function strips
    expect(formatQty(13257.1000000000002)).toBe("13257.1");
  });

  it("strips floating-point noise on near-fractional", () => {
    expect(formatQty(13977.599999999999)).toBe("13977.6");
  });

  it("rounds to 2 dp", () => {
    expect(formatQty(1.234)).toBe("1.23");
  });

  it("preserves whole numbers without decimals", () => {
    expect(formatQty(100)).toBe("100");
  });
});

describe("flangeConfigSuffix", () => {
  it("returns empty string for null/undefined config", () => {
    expect(flangeConfigSuffix(null, "steel", "PN16")).toBe("");
    expect(flangeConfigSuffix(undefined, "steel", "PN16")).toBe("");
  });

  it("returns empty string for plain-end config 'PE'", () => {
    expect(flangeConfigSuffix("PE", "steel", "PN16")).toBe("");
  });

  it("formats steel FBE as 'Flanged Both Ends'", () => {
    expect(flangeConfigSuffix("FBE", "steel", "PN16")).toBe(" — Flanged Both Ends PN16");
  });

  it("formats steel FOE as 'Flanged One End'", () => {
    expect(flangeConfigSuffix("FOE", "steel", "PN16")).toBe(" — Flanged One End PN16");
  });

  it("formats steel FBE_BLIND as 'Flanged Both Ends (Blind)'", () => {
    expect(flangeConfigSuffix("FBE_BLIND", "steel", "PN16")).toBe(
      " — Flanged Both Ends (Blind) PN16",
    );
  });

  it("formats HDPE FBE as 'Stub Both Ends w/ Backing Flange'", () => {
    expect(flangeConfigSuffix("FBE", "hdpe", "PN16")).toBe(
      " — Stub Both Ends w/ Backing Flange PN16",
    );
  });

  it("formats PVC FBE as 'Stub Both Ends w/ Backing Flange'", () => {
    expect(flangeConfigSuffix("FBE", "pvc", "PN16")).toBe(
      " — Stub Both Ends w/ Backing Flange PN16",
    );
  });

  it("falls back to raw config string when not in known set", () => {
    expect(flangeConfigSuffix("WEIRD", "steel", "PN16")).toBe(" — Flanged WEIRD PN16");
  });
});

describe("getFlangeTypeName", () => {
  it("returns 'Slip On' for plain-end 'PE'", () => {
    expect(getFlangeTypeName("PE")).toBe("Slip On");
  });

  it("returns 'Slip On' for empty string", () => {
    expect(getFlangeTypeName("")).toBe("Slip On");
  });

  it("returns 'Slip On' for LF (lap flange) suffix", () => {
    expect(getFlangeTypeName("FBE_LF")).toBe("Slip On");
  });

  it("returns 'Slip On' for _L (lap) suffix", () => {
    expect(getFlangeTypeName("FBE_L")).toBe("Slip On");
  });

  it("returns 'Rotating' for RF (raised face) suffix", () => {
    expect(getFlangeTypeName("FBE_RF")).toBe("Rotating");
  });

  it("returns 'Rotating' for _R suffix", () => {
    expect(getFlangeTypeName("FBE_R")).toBe("Rotating");
  });

  it("defaults to 'Slip On' for unknown configs", () => {
    expect(getFlangeTypeName("FBE")).toBe("Slip On");
    expect(getFlangeTypeName("WEIRD")).toBe("Slip On");
  });
});

describe("safeFilename", () => {
  it("lowercases letters", () => {
    expect(safeFilename("HelloWorld")).toBe("helloworld");
  });

  it("replaces non-alphanumeric runs with single hyphen", () => {
    expect(safeFilename("Hello, World! v1.2")).toBe("hello-world-v1-2");
  });

  it("strips leading and trailing hyphens", () => {
    expect(safeFilename("---hello---")).toBe("hello");
  });

  it("returns 'section' fallback for all-special-char input", () => {
    expect(safeFilename("!!!")).toBe("section");
  });

  it("returns 'section' fallback for empty string", () => {
    expect(safeFilename("")).toBe("section");
  });

  it("preserves digits", () => {
    expect(safeFilename("RFQ Section 12")).toBe("rfq-section-12");
  });
});

describe("bendCenterToFaceMm", () => {
  it("computes a 90° bend at 1.5D as nb × 1.5", () => {
    // R = 100 × 1.5 = 150; tan(45°) = 1; C/F = 150
    expect(bendCenterToFaceMm(100, 90, "1.5D")).toBe(150);
  });

  it("computes a 45° bend at 1.5D as approximately nb × 1.5 × tan(22.5°)", () => {
    // R = 100 × 1.5 = 150; tan(22.5°) ≈ 0.4142; C/F ≈ 62.13 → rounded 62
    expect(bendCenterToFaceMm(100, 45, "1.5D")).toBe(62);
  });

  it("uses 1.5D as default when bendType is empty", () => {
    expect(bendCenterToFaceMm(100, 90, "")).toBe(150);
  });

  it("uses 1.5D as default when bendType is unparseable", () => {
    expect(bendCenterToFaceMm(100, 90, "weird")).toBe(150);
  });

  it("respects 3D bend ratio", () => {
    // R = 100 × 3 = 300; tan(45°) = 1; C/F = 300
    expect(bendCenterToFaceMm(100, 90, "3D")).toBe(300);
  });

  it("rounds to nearest integer", () => {
    // 22° at NB 50, 1.5D — keeps decimal but result rounded
    const result = bendCenterToFaceMm(50, 22, "1.5D");
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("materialOfEntry", () => {
  it("returns 'hdpe' when entry.materialType is 'hdpe'", () => {
    expect(materialOfEntry({ materialType: "hdpe" })).toBe("hdpe");
  });

  it("returns 'pvc' when entry.materialType is 'pvc'", () => {
    expect(materialOfEntry({ materialType: "pvc" })).toBe("pvc");
  });

  it("returns 'pvc' when entry.materialType is 'upvc'", () => {
    expect(materialOfEntry({ materialType: "upvc" })).toBe("pvc");
  });

  it("returns 'steel' when entry.materialType is 'steel'", () => {
    expect(materialOfEntry({ materialType: "steel" })).toBe("steel");
  });

  it("returns 'steel' as default for undefined materialType", () => {
    expect(materialOfEntry({})).toBe("steel");
  });

  it("falls back to specs.productType when materialType is absent", () => {
    expect(materialOfEntry({ specs: { productType: "hdpe" } })).toBe("hdpe");
    expect(materialOfEntry({ specs: { productType: "pvc" } })).toBe("pvc");
  });

  it("entry.materialType wins over specs.productType when both are set", () => {
    expect(materialOfEntry({ materialType: "hdpe", specs: { productType: "steel" } })).toBe("hdpe");
  });
});

describe("getPhysicalFlangeCount", () => {
  describe("pipe / bend / unknown itemType", () => {
    it("PE returns zero counts", () => {
      expect(getPhysicalFlangeCount("PE", "straight_pipe")).toEqual({
        fixed: 0,
        loose: 0,
        rotating: 0,
      });
    });

    it("FOE returns 1 fixed", () => {
      expect(getPhysicalFlangeCount("FOE", "bend")).toEqual({ fixed: 1, loose: 0, rotating: 0 });
    });

    it("FBE returns 2 fixed", () => {
      expect(getPhysicalFlangeCount("FBE", "straight_pipe")).toEqual({
        fixed: 2,
        loose: 0,
        rotating: 0,
      });
    });

    it("FOE_LF returns 1 fixed + 1 loose", () => {
      expect(getPhysicalFlangeCount("FOE_LF", "bend")).toEqual({
        fixed: 1,
        loose: 1,
        rotating: 0,
      });
    });

    it("FOE_RF returns 1 fixed + 1 rotating", () => {
      expect(getPhysicalFlangeCount("FOE_RF", "bend")).toEqual({
        fixed: 1,
        loose: 0,
        rotating: 1,
      });
    });

    it("2X_RF returns 2 rotating", () => {
      expect(getPhysicalFlangeCount("2X_RF", "straight_pipe")).toEqual({
        fixed: 0,
        loose: 0,
        rotating: 2,
      });
    });

    it("2xLF returns 4 loose", () => {
      expect(getPhysicalFlangeCount("2xLF", "straight_pipe")).toEqual({
        fixed: 0,
        loose: 4,
        rotating: 0,
      });
    });

    it("unknown config returns zero counts", () => {
      expect(getPhysicalFlangeCount("WEIRD", "bend")).toEqual({ fixed: 0, loose: 0, rotating: 0 });
    });

    it("undefined itemType uses pipe/bend rules", () => {
      expect(getPhysicalFlangeCount("FBE", "")).toEqual({ fixed: 2, loose: 0, rotating: 0 });
    });
  });

  describe("fitting itemType", () => {
    it("PE returns zero counts", () => {
      expect(getPhysicalFlangeCount("PE", "fitting")).toEqual({
        fixed: 0,
        loose: 0,
        rotating: 0,
      });
    });

    it("FAE returns 3 fixed", () => {
      expect(getPhysicalFlangeCount("FAE", "fitting")).toEqual({
        fixed: 3,
        loose: 0,
        rotating: 0,
      });
    });

    it("F2E returns 2 fixed", () => {
      expect(getPhysicalFlangeCount("F2E", "fitting")).toEqual({
        fixed: 2,
        loose: 0,
        rotating: 0,
      });
    });

    it("F2E_LF returns 2 fixed + 1 loose", () => {
      expect(getPhysicalFlangeCount("F2E_LF", "fitting")).toEqual({
        fixed: 2,
        loose: 1,
        rotating: 0,
      });
    });

    it("F2E_RF returns 2 fixed + 1 rotating", () => {
      expect(getPhysicalFlangeCount("F2E_RF", "fitting")).toEqual({
        fixed: 2,
        loose: 0,
        rotating: 1,
      });
    });

    it("3X_RF returns 3 rotating", () => {
      expect(getPhysicalFlangeCount("3X_RF", "fitting")).toEqual({
        fixed: 0,
        loose: 0,
        rotating: 3,
      });
    });

    it("2X_RF_FOE returns 1 fixed + 2 rotating", () => {
      expect(getPhysicalFlangeCount("2X_RF_FOE", "fitting")).toEqual({
        fixed: 1,
        loose: 0,
        rotating: 2,
      });
    });

    it("unknown fitting config returns zero counts", () => {
      expect(getPhysicalFlangeCount("WEIRD", "fitting")).toEqual({
        fixed: 0,
        loose: 0,
        rotating: 0,
      });
    });
  });

  it("unknown itemType returns zero counts", () => {
    expect(getPhysicalFlangeCount("FBE", "valve")).toEqual({ fixed: 0, loose: 0, rotating: 0 });
  });
});

describe("getFlangeCountFromConfig", () => {
  describe("pipe / bend itemType — sums physical counts into main", () => {
    it("PE returns 0/0", () => {
      expect(getFlangeCountFromConfig("PE", "bend")).toEqual({ main: 0, branch: 0 });
    });

    it("FBE returns 2/0", () => {
      expect(getFlangeCountFromConfig("FBE", "straight_pipe")).toEqual({ main: 2, branch: 0 });
    });

    it("FOE_LF (1 fixed + 1 loose) returns 2/0", () => {
      expect(getFlangeCountFromConfig("FOE_LF", "bend")).toEqual({ main: 2, branch: 0 });
    });

    it("2xLF (4 loose) returns 4/0", () => {
      expect(getFlangeCountFromConfig("2xLF", "straight_pipe")).toEqual({ main: 4, branch: 0 });
    });
  });

  describe("fitting itemType — distinct main/branch shape", () => {
    it("PE returns 0/0", () => {
      expect(getFlangeCountFromConfig("PE", "fitting")).toEqual({ main: 0, branch: 0 });
    });

    it("FAE returns 2 main + 1 branch", () => {
      expect(getFlangeCountFromConfig("FAE", "fitting")).toEqual({ main: 2, branch: 1 });
    });

    it("3X_RF returns 2 main + 1 branch", () => {
      expect(getFlangeCountFromConfig("3X_RF", "fitting")).toEqual({ main: 2, branch: 1 });
    });

    it("2X_RF_FOE returns 2 main + 1 branch", () => {
      expect(getFlangeCountFromConfig("2X_RF_FOE", "fitting")).toEqual({ main: 2, branch: 1 });
    });

    it("F2E_LF returns 1 main + 1 branch", () => {
      expect(getFlangeCountFromConfig("F2E_LF", "fitting")).toEqual({ main: 1, branch: 1 });
    });

    it("F2E_RF returns 1 main + 1 branch", () => {
      expect(getFlangeCountFromConfig("F2E_RF", "fitting")).toEqual({ main: 1, branch: 1 });
    });

    it("F2E returns 2 main + 0 branch", () => {
      expect(getFlangeCountFromConfig("F2E", "fitting")).toEqual({ main: 2, branch: 0 });
    });

    it("unknown fitting config falls back to summed main", () => {
      // unknown → physical 0/0/0 → totalMain 0
      expect(getFlangeCountFromConfig("WEIRD", "fitting")).toEqual({ main: 0, branch: 0 });
    });
  });
});

describe("detectPipeVariant", () => {
  it("returns null for empty / nullish input", () => {
    expect(detectPipeVariant("")).toBeNull();
    expect(detectPipeVariant(undefined)).toBeNull();
    expect(detectPipeVariant(null)).toBeNull();
  });

  it("returns 'perforated' for perforated drain pipe descriptions", () => {
    expect(detectPipeVariant("a) Perforated HDPE PE100 PN34 (SDR6) drain pipes:")).toBe(
      "perforated",
    );
    expect(detectPipeVariant("PERFORATED 250mm HDPE")).toBe("perforated");
  });

  it("returns 'slotted' for slotted variants", () => {
    expect(detectPipeVariant("Slotted HDPE PE100 drain")).toBe("slotted");
  });

  it("returns 'solid' only when 'solid' qualifies the pipe", () => {
    expect(detectPipeVariant("b) Solid HDPE PE100 PN34 (SDR6) drain pipes:")).toBe("solid");
    expect(detectPipeVariant("Solid PVC pipe")).toBe("solid");
    expect(detectPipeVariant("Solid weld 360°")).toBeNull();
  });

  it("returns null for standard pipe with no variant keyword", () => {
    expect(detectPipeVariant("250OD PE100 SDR6 PN34 HDPE Pipe x12m")).toBeNull();
    expect(detectPipeVariant("DN 100 mild steel pipe SCH40")).toBeNull();
  });
});

describe("pipeVariantPrefix", () => {
  it("returns title-cased prefix with trailing space for each known variant", () => {
    expect(pipeVariantPrefix("perforated")).toBe("Perforated ");
    expect(pipeVariantPrefix("slotted")).toBe("Slotted ");
    expect(pipeVariantPrefix("solid")).toBe("Solid ");
    expect(pipeVariantPrefix("drainage")).toBe("Drainage ");
    expect(pipeVariantPrefix("electrical")).toBe("Conduit ");
  });

  it("returns empty string for null", () => {
    expect(pipeVariantPrefix(null)).toBe("");
  });
});

describe("detectPipeVariant — PVC variants", () => {
  it("returns 'drainage' for gravity/sewer descriptions", () => {
    expect(detectPipeVariant("DN 110 uPVC sewer main")).toBe("drainage");
    expect(detectPipeVariant("Gravity drain PVC pipe SANS 791")).toBe("drainage");
  });

  it("returns 'electrical' for conduit descriptions", () => {
    expect(detectPipeVariant("PVC electrical conduit DN 25")).toBe("electrical");
    expect(detectPipeVariant("Conduit PVC to SANS 1602")).toBe("electrical");
  });

  it("returns null for pressure PVC with no variant marker", () => {
    expect(detectPipeVariant("DN 110 uPVC Class 16 pressure pipe")).toBeNull();
  });
});

const consolidatedItem = (material: ConsolidatedItem["material"]): ConsolidatedItem =>
  ({
    description: "test",
    qty: 1,
    unit: "ea",
    weight: 0,
    entries: [],
    entryIds: [],
    material,
  }) as unknown as ConsolidatedItem;

describe("filterByMaterial", () => {
  it("returns an empty map for an empty input", () => {
    const result = filterByMaterial(new Map(), "hdpe");
    expect(result.size).toBe(0);
  });

  it("keeps only items matching the requested material", () => {
    const input = new Map<string, ConsolidatedItem>([
      ["a", consolidatedItem("hdpe")],
      ["b", consolidatedItem("steel")],
      ["c", consolidatedItem("hdpe")],
      ["d", consolidatedItem("pvc")],
    ]);
    const result = filterByMaterial(input, "hdpe");
    expect(result.size).toBe(2);
    expect(result.has("a")).toBe(true);
    expect(result.has("c")).toBe(true);
    expect(result.has("b")).toBe(false);
    expect(result.has("d")).toBe(false);
  });

  it("does not mutate the input map", () => {
    const input = new Map<string, ConsolidatedItem>([["a", consolidatedItem("steel")]]);
    filterByMaterial(input, "hdpe");
    expect(input.size).toBe(1);
    expect(input.get("a")?.material).toBe("steel");
  });

  it("preserves the original keys for matching items", () => {
    const input = new Map<string, ConsolidatedItem>([
      ["specific-key-x", consolidatedItem("steel")],
    ]);
    const result = filterByMaterial(input, "steel");
    expect(result.has("specific-key-x")).toBe(true);
  });
});

const rowItem = (overrides: Partial<ConsolidatedItem> = {}): ConsolidatedItem =>
  ({
    description: "Test pipe DN150",
    qty: 2,
    unit: "ea",
    weight: 12.5,
    entries: ["item-1", "item-2"],
    entryIds: ["id-1", "id-2"],
    material: "steel",
    ...overrides,
  }) as unknown as ConsolidatedItem;

describe("consolidatedToRows", () => {
  it("returns an empty array for an empty input map", () => {
    expect(consolidatedToRows(new Map(), false, false, EMPTY_SOURCE_CONTEXT)).toEqual([]);
  });

  it("renders a basic row with description, qty, unit, weight, From Items, and # number", () => {
    const items = new Map<string, ConsolidatedItem>([["a", rowItem()]]);
    const [row] = consolidatedToRows(items, false, false, EMPTY_SOURCE_CONTEXT);
    expect(row.Description).toBe("Test pipe DN150");
    expect(row.Qty).toBe(2);
    expect(row.Unit).toBe("ea");
    expect(row["Weight (kg)"]).toBe("12.50");
    expect(row["From Items"]).toBe("item-1, item-2");
    expect(row["#"]).toBe(1);
  });

  it("does NOT include the Source column when hasAnySourceLocations is false", () => {
    const items = new Map<string, ConsolidatedItem>([["a", rowItem()]]);
    const [row] = consolidatedToRows(items, false, false, EMPTY_SOURCE_CONTEXT);
    expect(row).not.toHaveProperty("Source");
  });

  it("includes a Source column when hasAnySourceLocations is true, joined by ', '", () => {
    const items = new Map<string, ConsolidatedItem>([["a", rowItem()]]);
    const sourceLookup = new Map<string, string>([
      ["id-1", "Tender p.4 row 12"],
      ["id-2", "Tender p.4 row 13"],
    ]);
    const [row] = consolidatedToRows(items, false, false, {
      hasAnySourceLocations: true,
      sourceLookup,
    });
    expect(row.Source).toBe("Tender p.4 row 12, Tender p.4 row 13");
  });

  it("renders an em-dash placeholder in Source when no matching labels are found", () => {
    const items = new Map<string, ConsolidatedItem>([["a", rowItem()]]);
    const [row] = consolidatedToRows(items, false, false, {
      hasAnySourceLocations: true,
      sourceLookup: new Map(),
    });
    expect(row.Source).toBe("—");
  });

  it("includes weld columns when showWeldColumns is true, formatted to 2dp", () => {
    const items = new Map<string, ConsolidatedItem>([
      ["a", rowItem({ welds: { butt: 4.123, fillet: 1.987 } } as Partial<ConsolidatedItem>)],
    ]);
    const [row] = consolidatedToRows(items, true, false, EMPTY_SOURCE_CONTEXT);
    expect(row["butt (m)"]).toBe("4.12");
    expect(row["fillet (m)"]).toBe("1.99");
  });

  it("leaves the per-row weld cell empty when that row has no value for the weld type", () => {
    const items = new Map<string, ConsolidatedItem>([
      ["a", rowItem({ welds: { butt: 4 } } as Partial<ConsolidatedItem>)],
      ["b", rowItem({ welds: { fillet: 1 } } as Partial<ConsolidatedItem>)],
    ]);
    const [rowA, rowB] = consolidatedToRows(items, true, false, EMPTY_SOURCE_CONTEXT);
    expect(rowA["butt (m)"]).toBe("4.00");
    expect(rowA["fillet (m)"]).toBe("");
    expect(rowB["butt (m)"]).toBe("");
    expect(rowB["fillet (m)"]).toBe("1.00");
  });

  it("includes area columns when showAreaColumns is true, formatted to 2dp", () => {
    const items = new Map<string, ConsolidatedItem>([
      ["a", rowItem({ intAreaM2: 1.234, extAreaM2: 2.456 } as Partial<ConsolidatedItem>)],
    ]);
    const [row] = consolidatedToRows(items, false, true, EMPTY_SOURCE_CONTEXT);
    expect(row["Int m²"]).toBe("1.23");
    expect(row["Ext m²"]).toBe("2.46");
  });

  it("numbers rows sequentially starting from 1", () => {
    const items = new Map<string, ConsolidatedItem>([
      ["a", rowItem()],
      ["b", rowItem()],
      ["c", rowItem()],
    ]);
    const rows = consolidatedToRows(items, false, false, EMPTY_SOURCE_CONTEXT);
    expect(rows.map((r) => r["#"])).toEqual([1, 2, 3]);
  });
});
