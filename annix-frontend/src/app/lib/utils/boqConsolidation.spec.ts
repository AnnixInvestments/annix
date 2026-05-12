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

  it("populates pvcStubs when a PVC pipe is flanged-both-ends", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          description: "DN 110 uPVC Class 16 pipe",
          specs: {
            nominalBoreMm: 110,
            scheduleNumber: "",
            pipeEndConfiguration: "FBE",
            individualPipeLength: 6,
            quantityValue: 5,
            quantityType: "number_of_pipes",
            flangeStandardId: 1,
            flangePressureClassId: 1,
          },
          calculation: { outsideDiameterMm: 110, wallThicknessMm: 8.1, calculatedPipeCount: 5 },
        }),
      ],
      globalSpecs: { pvcType: "uPVC" },
      masterData: {
        flangeStandards: [{ id: 1, code: "SANS 1123" }],
        pressureClasses: [{ id: 1, designation: "T1600/3" }],
      },
    });

    expect(result.pvcStubs).toBeDefined();
    expect(result.pvcStubs).toHaveLength(1);
    const row = result.pvcStubs?.[0];
    if (!row) return;
    expect(row.qty).toBe(10);
    expect(row.description).toContain("110OD");
    expect(row.description).toContain("uPVC");
    expect(row.description).toContain("Stub Flange Adapter");
  });

  it("does NOT populate pvcCouplings for FBE pipes (flanged ends, no coupling needed)", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          specs: {
            nominalBoreMm: 110,
            pipeEndConfiguration: "FBE",
            individualPipeLength: 6,
            quantityValue: 5,
            quantityType: "number_of_pipes",
          },
          calculation: { outsideDiameterMm: 110, wallThicknessMm: 8.1, calculatedPipeCount: 5 },
        }),
      ],
      globalSpecs: { pvcJoiningMethod: "solvent_cement" },
    });

    expect(result.pvcCouplings).toBeUndefined();
  });

  it("populates pvcCouplings as (pipeQty - 1) for plain-ended PVC pipes (solvent_cement default)", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          specs: {
            nominalBoreMm: 110,
            pipeEndConfiguration: "PE",
            individualPipeLength: 6,
            quantityValue: 10,
            quantityType: "number_of_pipes",
          },
          calculation: { outsideDiameterMm: 110, wallThicknessMm: 8.1, calculatedPipeCount: 10 },
        }),
      ],
      globalSpecs: { pvcType: "uPVC", pvcPressureClass: 16, pvcJoiningMethod: "solvent_cement" },
    });

    expect(result.pvcCouplings).toBeDefined();
    expect(result.pvcCouplings).toHaveLength(1);
    const row = result.pvcCouplings?.[0];
    if (!row) return;
    expect(row.qty).toBe(9);
    expect(row.description).toContain("Slip Coupling");
    expect(row.description).toContain("Class 16");
  });

  it("uses RRJ coupling label when pvcJoiningMethod is rubber_ring", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          specs: {
            nominalBoreMm: 200,
            pipeEndConfiguration: "PE",
            individualPipeLength: 6,
            quantityValue: 8,
            quantityType: "number_of_pipes",
          },
          calculation: { outsideDiameterMm: 200, wallThicknessMm: 14.7, calculatedPipeCount: 8 },
        }),
      ],
      globalSpecs: { pvcJoiningMethod: "rubber_ring" },
    });

    const row = result.pvcCouplings?.[0];
    if (!row) return;
    expect(row.qty).toBe(7);
    expect(row.description).toContain("RRJ Coupling");
  });

  it("does NOT populate pvcCouplings when joining method is threaded or flanged_adaptor", () => {
    const threaded = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          specs: {
            nominalBoreMm: 32,
            pipeEndConfiguration: "PE",
            individualPipeLength: 6,
            quantityValue: 5,
            quantityType: "number_of_pipes",
          },
          calculation: { outsideDiameterMm: 32, wallThicknessMm: 2.8, calculatedPipeCount: 5 },
        }),
      ],
      globalSpecs: { pvcJoiningMethod: "threaded" },
    });
    expect(threaded.pvcCouplings).toBeUndefined();

    const flangedAdaptor = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "pvc",
          specs: {
            nominalBoreMm: 110,
            pipeEndConfiguration: "PE",
            individualPipeLength: 6,
            quantityValue: 5,
            quantityType: "number_of_pipes",
          },
          calculation: { outsideDiameterMm: 110, wallThicknessMm: 8.1, calculatedPipeCount: 5 },
        }),
      ],
      globalSpecs: { pvcJoiningMethod: "flanged_adaptor" },
    });
    expect(flangedAdaptor.pvcCouplings).toBeUndefined();
  });

  it("does NOT populate pvcStubs for steel or HDPE flanged pipes", () => {
    const result = consolidateBoqData({
      lookups: stubLookups,
      entries: [
        buildPipe({
          materialType: "steel",
          specs: {
            nominalBoreMm: 100,
            scheduleNumber: "Sch40",
            pipeEndConfiguration: "FBE",
            individualPipeLength: 6,
            quantityValue: 5,
            quantityType: "number_of_pipes",
            flangeStandardId: 1,
            flangePressureClassId: 1,
          },
          calculation: { outsideDiameterMm: 114.3, wallThicknessMm: 6.0, calculatedPipeCount: 5 },
        }),
      ],
      masterData: {
        flangeStandards: [{ id: 1, code: "SANS 1123" }],
        pressureClasses: [{ id: 1, designation: "T1600/3" }],
      },
    });

    expect(result.pvcStubs).toBeUndefined();
    // HDPE stubs path still works for HDPE entries — sanity that we
    // didn't accidentally route steel through it.
    expect(result.hdpeStubs).toBeUndefined();
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

// ────────────────────────────────────────────────────────────────────
// Phase 7 (issue #288): end-to-end fixture tests covering an entire
// mixed-material BOQ. Asserts welds + weldCounts + areas populate
// correctly, hdpeStubs / pvcStubs / pvcCouplings appear in the DTO,
// and the mapToDto() output is shape-stable. The earlier suites
// above test each shape in isolation; this one stitches them
// together against realistic inputs.
// ────────────────────────────────────────────────────────────────────
describe("consolidateBoqData — Phase 7 end-to-end fixtures", () => {
  describe("HDPE pipe + flange + stub end-to-end", () => {
    it("populates hdpeStubs and pipeWeld counts for a flanged HDPE pipe", () => {
      const result = consolidateBoqData({
        lookups: stubLookups,
        entries: [
          {
            itemType: "straight_pipe",
            materialType: "hdpe",
            clientItemNumber: "PE-001",
            description: "DN 250 PE100 SDR11 pipe",
            specs: {
              nominalBoreMm: 250,
              pipeEndConfiguration: "FBE",
              individualPipeLength: 12,
              quantityValue: 5,
              quantityType: "number_of_pipes",
              flangeStandardId: 1,
              flangePressureClassId: 1,
            },
            calculation: {
              outsideDiameterMm: 250,
              wallThicknessMm: 22.7,
              calculatedPipeCount: 5,
              calculatedTotalLength: 60,
            },
          },
        ],
        globalSpecs: { hdpeSdr: 11, hdpeGrade: "PE100" },
        masterData: {
          flangeStandards: [{ id: 1, code: "SANS 1123" }],
          pressureClasses: [{ id: 1, designation: "T1600/3" }],
        },
      });

      expect(result.straightPipes).toBeDefined();
      expect(result.straightPipes).toHaveLength(1);
      const pipeRow = result.straightPipes?.[0];
      if (!pipeRow) return;
      expect(pipeRow.qty).toBe(5);
      expect(pipeRow.welds?.pipeWeld).toBeGreaterThan(0);
      expect(pipeRow.weldCounts?.pipeWeld).toBe(5);
      expect(pipeRow.areas?.intAreaM2).toBeGreaterThan(0);
      expect(pipeRow.areas?.extAreaM2).toBeGreaterThan(0);

      expect(result.hdpeStubs).toBeDefined();
      expect(result.hdpeStubs).toHaveLength(1);
      const stubRow = result.hdpeStubs?.[0];
      if (!stubRow) return;
      // 2 flanged ends per pipe × 5 pipes = 10 stub adapters
      expect(stubRow.qty).toBe(10);
      expect(stubRow.description).toContain("Butt-Fusion Stub End");

      expect(result.pvcStubs).toBeUndefined();
      expect(result.pvcCouplings).toBeUndefined();
    });

    it("populates mitre welds + count for an HDPE bend", () => {
      const result = consolidateBoqData({
        lookups: stubLookups,
        entries: [
          {
            itemType: "bend",
            materialType: "hdpe",
            clientItemNumber: "PE-B-001",
            description: "DN 250 PE100 90° 5-segment mitre",
            specs: {
              nominalBoreMm: 250,
              bendDegrees: 90,
              bendType: "1.5D",
              bendEndConfiguration: "PE",
              quantityValue: 3,
              numberOfSegments: 5,
            },
            calculation: {
              outsideDiameterMm: 250,
              wallThicknessMm: 22.7,
              totalWeight: 18,
            },
          },
        ],
        globalSpecs: { hdpeSdr: 11 },
      });

      expect(result.bends).toBeDefined();
      const row = result.bends?.[0];
      if (!row) return;
      // 5 segments → 4 mitre welds per bend × 3 bends = 12
      expect(row.weldCounts?.mitreWeld).toBe(12);
      expect(row.welds?.mitreWeld).toBeGreaterThan(0);
    });

    it("populates tee welds + count for an HDPE equal-tee", () => {
      const result = consolidateBoqData({
        lookups: stubLookups,
        entries: [
          {
            itemType: "fitting",
            materialType: "hdpe",
            clientItemNumber: "PE-T-001",
            description: "DN 250 PE100 equal tee",
            specs: {
              nominalDiameterMm: 250,
              branchNominalDiameterMm: 250,
              fittingType: "EQUAL_TEE",
              pipeEndConfiguration: "PE",
              quantityValue: 2,
            },
            calculation: {
              outsideDiameterMm: 250,
              wallThicknessMm: 22.7,
              totalWeight: 25,
            },
          },
        ],
      });

      expect(result.tees).toBeDefined();
      const row = result.tees?.[0];
      if (!row) return;
      // 1 tee weld per fitting × 2 fittings = 2
      expect(row.weldCounts?.teeWeld).toBe(2);
      expect(row.welds?.teeWeld).toBeGreaterThan(0);
    });
  });

  describe("PVC pipe + flange + stub + coupling end-to-end", () => {
    it("populates pvcStubs + pvcCouplings + correct welds across the consolidated outputs", () => {
      const result = consolidateBoqData({
        lookups: stubLookups,
        entries: [
          {
            itemType: "straight_pipe",
            materialType: "pvc",
            clientItemNumber: "PVC-001",
            description: "DN 110 uPVC Class 16 pipe",
            specs: {
              nominalBoreMm: 110,
              pipeEndConfiguration: "FOE",
              individualPipeLength: 6,
              quantityValue: 10,
              quantityType: "number_of_pipes",
              flangeStandardId: 1,
              flangePressureClassId: 1,
            },
            calculation: {
              outsideDiameterMm: 110,
              wallThicknessMm: 8.1,
              calculatedPipeCount: 10,
              calculatedTotalLength: 60,
            },
          },
        ],
        globalSpecs: {
          pvcType: "uPVC",
          pvcPressureClass: 16,
          pvcJoiningMethod: "solvent_cement",
        },
        masterData: {
          flangeStandards: [{ id: 1, code: "SANS 1123" }],
          pressureClasses: [{ id: 1, designation: "T1600/3" }],
        },
      });

      // PVC straight pipe row populated with material-aware key.
      expect(result.straightPipes).toBeDefined();
      const pipeRow = result.straightPipes?.[0];
      if (!pipeRow) return;
      expect(pipeRow.qty).toBe(10);
      expect(pipeRow.description).toContain("PVC");

      // FOE → 1 flange per pipe × 10 pipes = 10 stub adapters.
      expect(result.pvcStubs).toBeDefined();
      const stubRow = result.pvcStubs?.[0];
      if (!stubRow) return;
      expect(stubRow.qty).toBe(10);
      expect(stubRow.description).toContain("uPVC");
      expect(stubRow.description).toContain("Stub Flange Adapter");

      // Couplings: pipeRowQty - 1 = 9. Joining method = solvent_cement
      // → Slip Coupling label.
      expect(result.pvcCouplings).toBeDefined();
      const couplingRow = result.pvcCouplings?.[0];
      if (!couplingRow) return;
      expect(couplingRow.qty).toBe(9);
      expect(couplingRow.description).toContain("Slip Coupling");

      // HDPE outputs absent.
      expect(result.hdpeStubs).toBeUndefined();
    });
  });

  describe("mapToDto shape snapshot — mixed BOQ", () => {
    it("emits a stable DTO shape for steel pipe + HDPE pipe + PVC pipe", () => {
      const result = consolidateBoqData({
        lookups: stubLookups,
        entries: [
          {
            itemType: "straight_pipe",
            materialType: "steel",
            clientItemNumber: "STL-001",
            description: "100NB Sch40 ASTM A106",
            specs: {
              nominalBoreMm: 100,
              scheduleNumber: "Sch40",
              pipeEndConfiguration: "PE",
              individualPipeLength: 6,
              quantityValue: 4,
              quantityType: "number_of_pipes",
            },
            calculation: {
              outsideDiameterMm: 114.3,
              wallThicknessMm: 6,
              calculatedPipeCount: 4,
            },
          },
          {
            itemType: "straight_pipe",
            materialType: "hdpe",
            clientItemNumber: "PE-001",
            description: "DN 250 PE100 SDR11",
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
            },
          },
          {
            itemType: "straight_pipe",
            materialType: "pvc",
            clientItemNumber: "PVC-001",
            description: "DN 110 uPVC Class 16",
            specs: {
              nominalBoreMm: 110,
              pipeEndConfiguration: "PE",
              individualPipeLength: 6,
              quantityValue: 8,
              quantityType: "number_of_pipes",
            },
            calculation: {
              outsideDiameterMm: 110,
              wallThicknessMm: 8.1,
              calculatedPipeCount: 8,
            },
          },
        ],
        globalSpecs: { pvcType: "uPVC", pvcPressureClass: 16, hdpeSdr: 11 },
      });

      // Three separate rows — different material keys keep them apart.
      expect(result.straightPipes).toHaveLength(3);

      // Shape stability — every row carries the expected fields.
      const rawStraightPipes = result.straightPipes;
      const rows = rawStraightPipes ?? [];
      rows.forEach((row) => {
        expect(row).toHaveProperty("description");
        expect(row).toHaveProperty("qty");
        expect(row).toHaveProperty("unit", "Each");
        expect(row).toHaveProperty("weightKg");
        expect(row).toHaveProperty("entries");
      });

      // PVC pipe is plain-ended → couplings populated (7 = 8 - 1).
      expect(result.pvcCouplings).toHaveLength(1);
      expect(result.pvcCouplings?.[0].qty).toBe(7);

      // No stubs (no flanged ends).
      expect(result.pvcStubs).toBeUndefined();
      expect(result.hdpeStubs).toBeUndefined();
    });
  });
});
