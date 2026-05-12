import { describe, expect, it } from "vitest";
import type { FlangeLookupContext } from "@/app/lib/query/hooks";
import { consolidateBoqData } from "./boqConsolidation";

const stubLookups: FlangeLookupContext = {
  flangeWeight: () => 0,
  blankFlangeWeight: () => 0,
  sansBlankFlangeWeight: () => 0,
  bnwSetInfo: () => ({
    boltSize: "M16",
    holesPerFlange: 4,
    weightPerHole: 0.5,
  }),
  gasketWeight: () => 0,
  blankFlangeSurfaceArea: () => ({ external: 0, internal: 0 }),
};

const buildPipe = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  itemType: "straight_pipe",
  materialType: "steel",
  clientItemNumber: "1",
  description: "100NB SCH40 ASTM A106 pipe",
  specs: {
    nominalBoreMm: 100,
    scheduleNumber: "Sch40",
    pipeEndConfiguration: "PE",
    individualPipeLength: 6,
    quantityValue: 10,
    quantityType: "number_of_pipes",
  },
  calculation: {
    outsideDiameterMm: 114.3,
    wallThicknessMm: 6.0,
    calculatedPipeCount: 10,
    calculatedTotalLength: 60,
  },
  ...overrides,
});

const buildBend = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  itemType: "bend",
  materialType: "steel",
  clientItemNumber: "2",
  description: "100NB 90° 1.5D bend",
  specs: {
    nominalBoreMm: 100,
    bendDegrees: 90,
    bendType: "1.5D",
    scheduleNumber: "Sch40",
    bendEndConfiguration: "PE",
    quantityValue: 4,
    numberOfSegments: 5,
  },
  calculation: {
    outsideDiameterMm: 114.3,
    wallThicknessMm: 6.0,
    totalWeight: 12.5,
  },
  ...overrides,
});

const buildFitting = (
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> => ({
  itemType: "fitting",
  materialType: "steel",
  clientItemNumber: "3",
  description: "100NB Equal Tee",
  specs: {
    nominalDiameterMm: 100,
    branchNominalDiameterMm: 100,
    fittingType: "EQUAL_TEE",
    scheduleNumber: "Sch40",
    pipeEndConfiguration: "PE",
    quantityValue: 2,
  },
  calculation: {
    outsideDiameterMm: 114.3,
    wallThicknessMm: 6.0,
    totalWeight: 8.5,
  },
  ...overrides,
});

describe("consolidateBoqData — Phase 0 pipe / bend / fitting consolidation", () => {
  it("populates straightPipes from a steel pipe entry", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [buildPipe()],
    });

    expect(result.straightPipes).toBeDefined();
    expect(result.straightPipes).toHaveLength(1);
    const row = result.straightPipes?.[0];
    if (!row) return;
    expect(row.qty).toBe(10);
    expect(row.description).toContain("100NB");
    expect(row.description).toContain("Steel");
  });

  it("populates bends with mitre weld length + count", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [buildBend()],
    });

    expect(result.bends).toBeDefined();
    expect(result.bends).toHaveLength(1);
    const row = result.bends?.[0];
    if (!row) return;
    expect(row.qty).toBe(4);
    // 5 segments => 4 mitre welds × qty=4 => 16 welds × π × 0.1143 ≈ 5.745 m
    expect(row.welds?.mitreWeld).toBeGreaterThan(5);
    expect(row.welds?.mitreWeld).toBeLessThan(6);
    expect(row.weldCounts?.mitreWeld).toBe(16);
  });

  it("populates tees (not reducers) for equal tee fittings", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [buildFitting()],
    });

    expect(result.tees).toBeDefined();
    expect(result.tees).toHaveLength(1);
    expect(result.reducers).toBeUndefined();
    const row = result.tees?.[0];
    if (!row) return;
    expect(row.welds?.teeWeld).toBeGreaterThan(0);
    expect(row.weldCounts?.teeWeld).toBe(2);
  });

  it("splits reducers into the reducers DTO array, not tees", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildFitting({
          specs: {
            nominalDiameterMm: 100,
            branchNominalDiameterMm: 80,
            fittingType: "CON_REDUCER",
            scheduleNumber: "Sch40",
            pipeEndConfiguration: "PE",
            quantityValue: 1,
          },
        }),
      ],
    });

    expect(result.reducers).toBeDefined();
    expect(result.reducers).toHaveLength(1);
    expect(result.tees).toBeUndefined();
    // Reducers have no tee weld — only the body, joined by upstream pipe weld.
    const row = result.reducers?.[0];
    if (!row) return;
    expect(row.welds?.teeWeld).toBeUndefined();
  });

  it("counts pipe welds for HDPE entries (1 butt-fusion per piece)", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "hdpe",
          description: "DN250 PE100 SDR11 pipe",
          specs: {
            nominalBoreMm: 250,
            pipeEndConfiguration: "PE",
            individualPipeLength: 12,
            quantityValue: 5,
            quantityType: "number_of_pipes",
          },
          calculation: {
            outsideDiameterMm: 250,
            wallThicknessMm: 22.7,
            calculatedPipeCount: 5,
            calculatedTotalLength: 60,
          },
        }),
      ],
    });

    expect(result.straightPipes).toBeDefined();
    const row = result.straightPipes?.[0];
    if (!row) return;
    expect(row.weldCounts?.pipeWeld).toBe(5);
    expect(row.welds?.pipeWeld).toBeGreaterThan(0);
    expect(row.description).toContain("HDPE");
  });

  it("consolidates two identical pipes into one row with summed qty", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [buildPipe(), buildPipe({ clientItemNumber: "1b" })],
    });

    expect(result.straightPipes).toHaveLength(1);
    expect(result.straightPipes?.[0].qty).toBe(20);
  });

  it("does NOT consolidate pipes of different materials with the same NB", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      // First entry defaults to steel; second forces hdpe.
      entries: [
        buildPipe(),
        buildPipe({
          materialType: "hdpe",
          clientItemNumber: "1b",
          calculation: {
            outsideDiameterMm: 250,
            wallThicknessMm: 22.7,
            calculatedPipeCount: 10,
            calculatedTotalLength: 60,
          },
        }),
      ],
    });

    expect(result.straightPipes).toHaveLength(2);
  });

  it("converts total_length quantities to piece counts via individualPipeLength", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          specs: {
            nominalBoreMm: 100,
            scheduleNumber: "Sch40",
            pipeEndConfiguration: "PE",
            individualPipeLength: 12,
            quantityValue: 7823.9,
            quantityType: "total_length",
          },
          calculation: undefined,
        }),
      ],
    });

    expect(result.straightPipes).toHaveLength(1);
    // ceil(7823.9 / 12) = ceil(651.99…) = 652
    expect(result.straightPipes?.[0].qty).toBe(652);
  });

  it("returns undefined for straightPipes / bends / fittings when there are no entries of that kind", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [],
    });

    expect(result.straightPipes).toBeUndefined();
    expect(result.bends).toBeUndefined();
    expect(result.tees).toBeUndefined();
    expect(result.reducers).toBeUndefined();
  });

  it("includes weldCounts on flanged pipes", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          specs: {
            nominalBoreMm: 100,
            scheduleNumber: "Sch40",
            pipeEndConfiguration: "FBE",
            individualPipeLength: 6,
            quantityValue: 10,
            quantityType: "number_of_pipes",
          },
          calculation: {
            outsideDiameterMm: 114.3,
            wallThicknessMm: 6.0,
            calculatedPipeCount: 10,
            totalFlangeWeldLength: 7.18,
          },
        }),
      ],
    });

    const row = result.straightPipes?.[0];
    if (!row) return;
    expect(row.welds?.flangeWeld).toBe(7.18);
    // 2 flanges per pipe × 10 pipes × 2 (inside+outside) = 40 welds
    expect(row.weldCounts?.flangeWeld).toBe(40);
  });
});
