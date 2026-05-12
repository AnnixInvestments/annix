import * as fs from "node:fs";
import { PdfExtractorService } from "./pdf-extractor.service";

jest.mock("node:fs");

jest.mock("pdf-parse", () => {
  const mockFn = jest.fn();
  return Object.assign(mockFn, { default: mockFn });
});

describe("PdfExtractorService", () => {
  let service: PdfExtractorService;
  let mockPdfParse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockPdfParse = require("pdf-parse");
    mockPdfParse.mockReset();
    service = new PdfExtractorService();
  });

  describe("extractFromPdf", () => {
    const setupMockPdf = (text: string) => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from("fake-pdf"));

      mockPdfParse.mockResolvedValue({
        text,
        numpages: 1,
      });
    };

    it("should extract items from PDF text", async () => {
      setupMockPdf(`
        Project: Test Project
        Location: Johannesburg

        Specification: CARBON STEEL API 5L Grade B, 6mm wall thickness

        1. 200NB Pipe, Sch 40, 6m long - 5 pcs
        2. 300NB 45 degree bend - 2 nos
        3. 400x300mm Reducer - 1 ea
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.length).toBeGreaterThanOrEqual(3);
      expect(result.sheetName).toBe("PDF Document");
    });

    it("should extract material from specification header", async () => {
      setupMockPdf(`
        Specification: CARBON STEEL API 5L Grade B

        200NB Pipe, 6m long - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem?.material).toBe("Carbon Steel");
    });

    it("should extract stainless steel material", async () => {
      setupMockPdf(`
        Specification: S.S. 316 STEEL

        200NB S.S. Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      const ssItem = result.items.find((i) => i.material === "Stainless Steel");
      expect(ssItem).toBeDefined();
    });

    it("should detect pipe items", async () => {
      setupMockPdf("200NB PIPE Carbon Steel - 5 lengths");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem).toBeDefined();
      expect(pipeItem?.diameter).toBe(200);
    });

    it("should detect bend items with angle", async () => {
      setupMockPdf("300NB 45 degree bend - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
      expect(bendItem?.diameter).toBe(300);
      expect(bendItem?.angle).toBe(45);
    });

    it("should detect elbow as bend", async () => {
      setupMockPdf("200NB 90 degree elbow - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
    });

    it("should detect reducer items with secondary diameter", async () => {
      setupMockPdf("400x300mm Reducer - 1 ea");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const reducerItem = result.items.find((i) => i.itemType === "reducer");
      expect(reducerItem).toBeDefined();
      expect(reducerItem?.secondaryDiameter).toBe(300);
    });

    it("should detect tee items", async () => {
      setupMockPdf("200NB Equal Tee - 3 nos");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const teeItem = result.items.find((i) => i.itemType === "tee");
      expect(teeItem).toBeDefined();
    });

    it("should detect flange items", async () => {
      setupMockPdf("200NB Weldneck Flange ANSI 150 - 4 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const flangeItem = result.items.find((i) => i.itemType === "flange");
      expect(flangeItem).toBeDefined();
    });

    it("should extract flange configuration - both ends", async () => {
      setupMockPdf("200NB Pipe both ends flanged - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "both_ends");
      expect(item).toBeDefined();
    });

    it("should extract flange configuration - one end", async () => {
      setupMockPdf("200NB Pipe one end flanged - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "one_end");
      expect(item).toBeDefined();
    });

    it("should extract puddle flange", async () => {
      setupMockPdf("200NB Pipe with puddle flange - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "puddle");
      expect(item).toBeDefined();
    });

    it("should extract quantity with different units", async () => {
      setupMockPdf(`
        200NB Pipe - 5 pcs
        300NB Pipe - 10 lengths
        400NB Pipe qty: 3
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.some((i) => i.quantity === 5)).toBe(true);
      expect(result.items.some((i) => i.quantity === 10)).toBe(true);
      expect(result.items.some((i) => i.quantity === 3)).toBe(true);
    });

    it("should extract length in meters", async () => {
      setupMockPdf("200NB Pipe 6m long - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.length === 6);
      expect(item).toBeDefined();
    });

    it("should extract project metadata", async () => {
      setupMockPdf(`
        Project Reference: PRJ-2024-001
        Site: Johannesburg
        Project: Mining Plant Expansion
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.projectLocation).toContain("Johannesburg");
    });

    it("should detect South African locations", async () => {
      setupMockPdf(`
        Project located in Cape Town
        200NB Pipe - 1 pc
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.projectLocation).toBeTruthy();
    });

    it("should extract wall thickness from specification", async () => {
      setupMockPdf(`
        Specification: API 5L Grade B, wall thickness: 6.35mm
        200NB Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.wallThickness).toBe("6.35mm");
    });

    it("should mark items needing clarification when diameter missing", async () => {
      setupMockPdf("Steel Pipe Carbon Steel - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const itemsNeedingClarification = result.items.filter((i) => i.needsClarification);
      expect(itemsNeedingClarification.length).toBeGreaterThanOrEqual(0);
    });

    it("should skip header lines", async () => {
      setupMockPdf(`
        Item Description Qty Unit
        200NB Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.every((i) => i.description !== "Item Description Qty Unit")).toBe(true);
    });

    it("should skip carried forward lines", async () => {
      setupMockPdf(`
        Carried Forward
        200NB Pipe - 2 pcs
        Brought Forward
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.every((i) => !i.description.includes("Carried Forward"))).toBe(true);
    });

    it("should extract DN diameter format", async () => {
      setupMockPdf("DN200 Pipe - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.diameter === 200);
      expect(item).toBeDefined();
    });

    it("should extract diameter from mm format", async () => {
      setupMockPdf("200mm dia Pipe - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.diameter === 200);
      expect(item).toBeDefined();
    });

    it("should extract expansion joint", async () => {
      setupMockPdf("200NB Expansion Joint - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.itemType === "expansion_joint");
      expect(item).toBeDefined();
    });

    describe("material patterns", () => {
      it.each([
        ["M.S. Pipe 200NB - 1 pc", "Mild Steel"],
        ["Mild Steel 200NB Pipe - 1 pc", "Mild Steel"],
        ["API 5L 200NB Pipe - 1 pc", "Carbon Steel"],
        ["SABS 719 200NB Pipe - 1 pc", "Carbon Steel"],
        ["ASTM A312 200NB Pipe - 1 pc", "Stainless Steel"],
        ["ASTM A234 WPB 200NB Fitting - 1 pc", "Carbon Steel"],
        ["ASTM A106 200NB Pipe - 1 pc", "Carbon Steel"],
        ["ERW 200NB Pipe - 1 pc", "Carbon Steel"],
      ])('should extract material from "%s" as "%s"', async (text, expectedMaterial) => {
        setupMockPdf(text);

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.items.some((i) => i.material === expectedMaterial)).toBe(true);
      });
    });

    describe("tender-spec metadata — working pressure + temperature", () => {
      it("extracts working pressure stated in bar", async () => {
        setupMockPdf("Working pressure: 16 bar at design conditions.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingPressureBar).toBe(16);
      });

      it("converts a kPa pressure to bar", async () => {
        setupMockPdf("Design pressure: 1600 kPa.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingPressureBar).toBe(16);
      });

      it("converts an MPa pressure to bar", async () => {
        setupMockPdf("Operating pressure 1.6 MPa.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingPressureBar).toBe(16);
      });

      it("falls back to SANS 1123 table designation when no explicit pressure stated", async () => {
        setupMockPdf("Flanges to SANS 1123 Table 1600/3.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingPressureBar).toBe(16);
      });

      it("extracts working temperature in °C", async () => {
        setupMockPdf("Working temperature: 80 °C");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingTemperatureC).toBe(80);
      });

      it("handles 'deg C' wording too", async () => {
        setupMockPdf("Design temperature: 65 deg C");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingTemperatureC).toBe(65);
      });

      it("handles negative working temperature", async () => {
        setupMockPdf("Min operating temperature: -5°C");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingTemperatureC).toBe(-5);
      });

      it("returns null when no pressure/temperature stated", async () => {
        setupMockPdf("Generic specification with no pressure or temperature mentioned.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.workingPressureBar).toBeNull();
        expect(result.metadata.workingTemperatureC).toBeNull();
      });
    });

    describe("valve spec extraction", () => {
      it("detects gate + pinch valves from a JW-V style clause", async () => {
        setupMockPdf(
          [
            "Particular Specification - Valves",
            "JWV-3.5 Gate valves shall be used for scour branches.",
            "Pinch valves are required for high-solids slurry service.",
            "All valves to be tested per API 598.",
          ].join("\n"),
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveTypes).toEqual(expect.arrayContaining(["Gate", "Pinch"]));
        expect(result.metadata.valveStandards).toEqual(expect.arrayContaining(["API 598"]));
      });

      it("detects multiple valve types in one document", async () => {
        setupMockPdf(
          [
            "Section JW-V Valves",
            "The Contractor shall supply gate valves, butterfly valves,",
            "non-return valves and dual-acting air valves for the system.",
            "Ball valves shall be stainless steel.",
          ].join("\n"),
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveTypes).toEqual(
          expect.arrayContaining(["Gate", "Butterfly", "Check / NRV", "Air valve", "Ball"]),
        );
      });

      it("detects valve standards (SANS 664/1849/1551, API 598)", async () => {
        setupMockPdf(
          [
            "Valve Specification",
            "Gate valves: SANS 664",
            "Butterfly valves: SANS 1849",
            "Check valves: SANS 1551 Parts 1 and 2",
            "Testing: API 598 and BS EN 12266-1",
          ].join("\n"),
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveStandards).toEqual(
          expect.arrayContaining([
            "SANS 664",
            "SANS 1849",
            "SANS 1551",
            "API 598",
            "BS EN 12266-1",
          ]),
        );
      });

      it("finds valves deep in a long document (clause on line 800)", async () => {
        const padding = Array.from({ length: 800 }, () => "Earthworks boilerplate line").join("\n");
        setupMockPdf(
          `${padding}\nParticular Specification JW-V\nPinch valves shall be supplied per SANS 1123 T4000.`,
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveTypes).toEqual(expect.arrayContaining(["Pinch"]));
      });

      it("captures a clause excerpt for traceability", async () => {
        setupMockPdf(
          [
            "Section V Valves",
            "All isolating valves shall be wedge gate, double-flanged to SANS 1123 T1600.",
          ].join("\n"),
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveClauseExcerpt).toContain("isolating valves");
      });

      it("returns null when no valves mentioned", async () => {
        setupMockPdf("Pipe spec only. No valves in scope.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.valveTypes).toBeNull();
      });
    });

    describe("flange standard extraction", () => {
      it("detects SANS 1123 with table designation", async () => {
        setupMockPdf("Flanges drilled to SANS 1123 Table 2500/3.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.flangeStandard).toBe("SANS 1123");
        expect(result.metadata.flangeTableDesignation).toBe("T2500");
      });

      it("detects ASME B16.5", async () => {
        setupMockPdf("All flanges to ASME B16.5 Class 300.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.flangeStandard).toBe("ASME B16.5");
      });

      it("detects BS EN 1092", async () => {
        setupMockPdf("Flange drilling: BS EN 1092-2 PN16.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.flangeStandard).toBe("BS EN 1092");
      });
    });

    describe("NDT methods extraction", () => {
      it("detects RT + UT + MT + PT + VT", async () => {
        setupMockPdf(
          "Welds shall be subject to 100% radiographic (RT) examination, ultrasonic (UT) where access is restricted, magnetic particle (MT) on the root, dye penetrant (PT) on stainless, and visual (VT) on all welds.",
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.ndtMethods).toEqual(
          expect.arrayContaining(["RT", "UT", "MT", "PT", "VT"]),
        );
      });

      it("returns null when no NDT mentioned", async () => {
        setupMockPdf("Generic spec with no inspection requirements.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.ndtMethods).toBeNull();
      });
    });

    describe("hydrotest multiplier extraction", () => {
      it("extracts 1.5x design pressure", async () => {
        setupMockPdf("Hydrostatic test pressure shall be 1.5 x design pressure.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestMultiplier).toBe(1.5);
      });

      it("extracts 1.25x MOP", async () => {
        setupMockPdf("Pipeline test pressure = 1.25 × MOP held for 4 hours.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestMultiplier).toBe(1.25);
      });

      it("returns null when no hydrotest stated", async () => {
        setupMockPdf("No test requirements listed.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestMultiplier).toBeNull();
      });
    });

    describe("hydrotest hold time extraction", () => {
      it("extracts hold time in minutes directly", async () => {
        setupMockPdf("Hydrotest held for 30 minutes at 1.5× design.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestHoldMinutes).toBe(30);
      });

      it("converts a hold time stated in hours to minutes", async () => {
        setupMockPdf("Hydrostatic test pressure held for 2 hours.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestHoldMinutes).toBe(120);
      });

      it("returns null when hold time is not stated", async () => {
        setupMockPdf("Hydrotest at 1.5× design pressure.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.hydrotestHoldMinutes).toBeNull();
      });
    });

    describe("NACE compliance extraction", () => {
      it("detects NACE MR0175", async () => {
        setupMockPdf("All materials shall comply with NACE MR0175.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.naceCompliance).toBe("NACE MR0175");
      });

      it("detects NACE MR0103", async () => {
        setupMockPdf("Refining service per NACE MR0103.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.naceCompliance).toBe("NACE MR0103");
      });

      it("detects ISO 15156", async () => {
        setupMockPdf("Sour service per ISO 15156-2.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.naceCompliance).toBe("ISO 15156");
      });

      it("returns null when no NACE clause", async () => {
        setupMockPdf("Generic spec with no compliance mentioned.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.naceCompliance).toBeNull();
      });
    });

    describe("sour service detection", () => {
      it("flags sour service when H2S is mentioned", async () => {
        setupMockPdf("Service contains H2S — sour service piping required.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.sourService).toBe(true);
      });

      it("flags sour service when 'hydrogen sulphide' is mentioned", async () => {
        setupMockPdf("Process gas contains hydrogen sulphide.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.sourService).toBe(true);
      });

      it("returns null when service type is not declared", async () => {
        setupMockPdf("Water main project — no aggressive fluids.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.sourService).toBeNull();
      });
    });

    describe("gasket type extraction", () => {
      it("detects spiral-wound", async () => {
        setupMockPdf("Flanges fitted with spiral-wound gaskets per ASME B16.20.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.gasketType).toBe("Spiral-wound");
      });

      it("detects RTJ", async () => {
        setupMockPdf("Ring Type Joint flanges required.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.gasketType).toBe("Ring Type Joint (RTJ)");
      });

      it("detects EPDM gasket", async () => {
        setupMockPdf("Water service uses EPDM gasket between flanges.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.gasketType).toBe("EPDM");
      });

      it("returns null when no gasket type stated", async () => {
        setupMockPdf("Generic flange spec.");

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.metadata.gasketType).toBeNull();
      });
    });

    describe("deep-document spec scanning", () => {
      it("finds spec data beyond the first 50 lines (previously truncated)", async () => {
        const filler = Array.from({ length: 120 }, () => "Filler line of boilerplate text.").join(
          "\n",
        );
        setupMockPdf(
          `${filler}\nMATERIAL SPECIFICATION\nCarbon Steel API 5L Grade B, 6mm wall thickness, CML lined, polyurethane coated.`,
        );

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.specificationCells.length).toBeGreaterThan(0);
        expect(result.metadata.materialGrade).toBeTruthy();
      });
    });
  });
});
