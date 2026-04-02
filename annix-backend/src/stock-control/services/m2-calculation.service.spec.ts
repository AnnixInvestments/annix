import { Test, TestingModule } from "@nestjs/testing";
import { FlangeDimensionService } from "../../flange-dimension/flange-dimension.service";
import { NbOdLookupService } from "../../nb-od-lookup/nb-od-lookup.service";
import { NixItemParserService } from "../../nix/services/nix-item-parser.service";
import { PipeScheduleService } from "../../pipe-schedule/pipe-schedule.service";
import { M2CalculationService } from "./m2-calculation.service";

describe("M2CalculationService", () => {
  let service: M2CalculationService;

  const mockNbOdLookup = {
    nbToOd: jest.fn(),
  };

  const mockPipeSchedule = {
    getSchedulesByNbMm: jest.fn(),
  };

  const mockNixItemParser = {
    parseUserIntent: jest.fn(),
  };

  const mockFlangeDimension = {
    flangeDimensionsForM2: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M2CalculationService,
        { provide: NbOdLookupService, useValue: mockNbOdLookup },
        { provide: PipeScheduleService, useValue: mockPipeSchedule },
        { provide: NixItemParserService, useValue: mockNixItemParser },
        { provide: FlangeDimensionService, useValue: mockFlangeDimension },
      ],
    }).compile();

    service = module.get<M2CalculationService>(M2CalculationService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  function setupStandardMocks(odMm = 114.3, wallThickness = 6.02) {
    mockNbOdLookup.nbToOd.mockResolvedValue({ outsideDiameterMm: odMm });
    mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([
      { schedule: "40", wallThicknessMm: wallThickness },
      { schedule: "Std", wallThicknessMm: wallThickness },
    ]);
    mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);
  }

  describe("regex parsing NB", () => {
    it("parses NB from description like '100 NB'", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6000 LG SCH 40"]);
      expect(result.parsedDiameterMm).toBe(100);
    });

    it("parses NB case-insensitively", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["150 nb pipe 6000 lg"]);
      expect(result.parsedDiameterMm).toBe(150);
    });
  });

  describe("regex parsing length", () => {
    it("parses LG format", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6000 LG"]);
      expect(result.parsedLengthM).toBe(6);
    });

    it("parses mm format", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 3000mm"]);
      expect(result.parsedLengthM).toBe(3);
    });

    it("parses M format with decimals", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6.1 M"]);
      expect(result.parsedLengthM).toBeCloseTo(6.1, 1);
    });
  });

  describe("regex parsing schedule and flange config", () => {
    it("parses schedule", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE SCH 40 6000 LG"]);
      expect(result.parsedSchedule).toBe("Sch 40");
    });

    it("parses FBE flange config", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE FBE 6000 LG"]);
      expect(result.parsedFlangeConfig).toBe("both_ends");
    });

    it("parses FOE flange config", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE FOE 6000 LG"]);
      expect(result.parsedFlangeConfig).toBe("one_end");
    });

    it("parses PE flange config", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE PE 6000 LG"]);
      expect(result.parsedFlangeConfig).toBe("plain_ends");
    });
  });

  describe("regex parsing item type", () => {
    it("identifies pipe", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6000 LG"]);
      expect(result.parsedItemType).toBe("pipe");
    });

    it("identifies bend", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB BEND 90° 150/100 6000 LG"]);
      expect(result.parsedItemType).toBe("bend");
    });

    it("identifies elbow as bend", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB ELBOW 6000 LG"]);
      expect(result.parsedItemType).toBe("bend");
    });
  });

  describe("bend arc length parsing", () => {
    it("calculates arc length from angle and radius", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB BEND 90° 150/100"]);
      const expectedArc = (90 / 360) * 2 * Math.PI * 150;
      expect(result.parsedLengthM).toBeCloseTo(expectedArc / 1000, 2);
    });

    it("handles multiplier in bend description", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB BEND 2x45° 150/100"]);
      const expectedArc = 2 * (45 / 360) * 2 * Math.PI * 150;
      expect(result.parsedLengthM).toBeCloseTo(expectedArc / 1000, 2);
    });
  });

  describe("M2 area calculation", () => {
    it("calculates external, internal and total m2", async () => {
      const odMm = 114.3;
      const wallThickness = 6.02;
      setupStandardMocks(odMm, wallThickness);

      const [result] = await service.calculateM2ForItems(["100 NB PIPE SCH 40 6000 LG"]);

      const lengthM = 6;
      const idMm = odMm - 2 * wallThickness;
      const expectedExternal = Math.PI * (odMm / 1000) * lengthM;
      const expectedInternal = Math.PI * (idMm / 1000) * lengthM;

      expect(result.externalM2).toBeCloseTo(expectedExternal, 2);
      expect(result.internalM2).toBeCloseTo(expectedInternal, 2);
      expect(result.totalM2).toBeCloseTo(expectedExternal + expectedInternal, 2);
    });

    it("uses OD * 0.9 as ID when no wall thickness found", async () => {
      mockNbOdLookup.nbToOd.mockResolvedValue({ outsideDiameterMm: 114.3 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6000 LG"]);

      const expectedInternal = Math.PI * ((114.3 * 0.9) / 1000) * 6;
      expect(result.internalM2).toBeCloseTo(expectedInternal, 2);
    });

    it("rounds to 4 decimal places", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE SCH 40 6000 LG"]);
      const decimalPlaces = (result.totalM2?.toString().split(".")[1] || "").length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });
  });

  describe("confidence scoring", () => {
    it("returns 0.9 confidence when regex finds both diameter and length", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100 NB PIPE 6000 LG"]);
      expect(result.confidence).toBe(0.9);
    });

    it("calls AI parser when regex cannot parse diameter", async () => {
      mockNixItemParser.parseUserIntent.mockResolvedValue({
        confidence: 0.7,
        specifications: { diameter: 100, length: 6 },
        itemType: "pipe",
      });
      setupStandardMocks();

      const [result] = await service.calculateM2ForItems(["some random pipe description 6000 LG"]);
      expect(mockNixItemParser.parseUserIntent).toHaveBeenCalled();
    });

    it("does not call AI parser when regex succeeds", async () => {
      setupStandardMocks();
      await service.calculateM2ForItems(["100 NB PIPE 6000 LG"]);
      expect(mockNixItemParser.parseUserIntent).not.toHaveBeenCalled();
    });

    it("returns error when neither regex nor AI can parse", async () => {
      mockNixItemParser.parseUserIntent.mockResolvedValue({
        confidence: 0.3,
        specifications: {},
        itemType: null,
      });

      const [result] = await service.calculateM2ForItems(["XYZZY"]);
      expect(result.totalM2).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it("returns 0 confidence on exception", async () => {
      mockNixItemParser.parseUserIntent.mockRejectedValue(new Error("AI failed"));

      const [result] = await service.calculateM2ForItems(["unknown item"]);
      expect(result.error).toBeTruthy();
    });
  });

  describe("calculateM2ForItems batch", () => {
    it("processes multiple descriptions", async () => {
      setupStandardMocks();
      const results = await service.calculateM2ForItems([
        "100 NB PIPE 6000 LG",
        "200 NB PIPE 3000 LG",
      ]);
      expect(results).toHaveLength(2);
    });
  });

  describe("wall thickness parsing", () => {
    it("parses W/T direct format (SABS 719)", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "500NB W/T 6mm SABS 719 ERW Pipe, 12.192Lg",
      ]);
      expect(result.parsedWallThicknessMm).toBe(6);
    });

    it("parses wall thickness in parentheses after schedule", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "100NB Sch 40 (6.02mm) ASTM A106 Gr B Pipe, 6000 LG",
      ]);
      expect(result.parsedWallThicknessMm).toBe(6.02);
    });

    it("uses parsed WT over schedule lookup", async () => {
      mockNbOdLookup.nbToOd.mockResolvedValue({ outsideDiameterMm: 114.3 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([
        { schedule: "40", wallThicknessMm: 99 },
      ]);

      const [result] = await service.calculateM2ForItems(["100NB Sch 40 (6.02mm) Pipe 6000 LG"]);
      const expectedId = 114.3 - 2 * 6.02;
      const expectedInternal = Math.PI * (expectedId / 1000) * 6;
      expect(result.internalM2).toBeCloseTo(expectedInternal, 2);
    });
  });

  describe("Lg meters format parsing", () => {
    it("parses decimal Lg as meters", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe, 12.192Lg"]);
      expect(result.parsedLengthM).toBeCloseTo(12.192, 2);
    });

    it("parses short decimal Lg as meters", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe, 3.65Lg"]);
      expect(result.parsedLengthM).toBeCloseTo(3.65, 2);
    });
  });

  describe("bend property parsing", () => {
    it("parses bend angle", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "80NB Sch 40 (5.49mm) ASTM A106 45° 3D Bend C/F 455mm",
      ]);
      expect(result.parsedBendAngle).toBe(45);
    });

    it("parses bend type", async () => {
      setupStandardMocks(88.9, 5.49);
      const [result] = await service.calculateM2ForItems([
        "80NB Sch 40 (5.49mm) ASTM A106 90° 3D Bend C/F 455mm",
      ]);
      expect(result.parsedBendType).toBe("3D");
    });

    it("calculates bend m2 using arc length formula", async () => {
      setupStandardMocks(88.9, 5.49);
      const [result] = await service.calculateM2ForItems([
        "80NB Sch 40 (5.49mm) ASTM A106 90° 3D Bend C/F 455mm",
      ]);
      expect(result.externalM2).toBeGreaterThan(0);
      expect(result.internalM2).toBeGreaterThan(0);
    });
  });

  describe("fitting parsing", () => {
    it("parses fitting dimensions from parenthesized format", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "100NB Short Equal Tee Sch40 (6.02mm) ASTM A106 (150x200)",
      ]);
      expect(result.parsedFittingType).toBe("equal_tee");
      expect(result.parsedItemType).toBe("tee");
    });

    it("calculates tee m2 without requiring length", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "100NB Short Equal Tee Sch40 (6.02mm) (150x200)",
      ]);
      expect(result.externalM2).toBeGreaterThan(0);
      expect(result.internalM2).toBeGreaterThan(0);
    });
  });

  describe("flange count parsing", () => {
    it("parses 2X R/F as 2 flanges", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe 6000 LG, 2X R/F"]);
      expect(result.parsedFlangeCount).toBe(2);
    });

    it("parses 1X R/F, 1X L/F as 2 flanges", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe 6000 LG, 1X R/F, 1X L/F"]);
      expect(result.parsedFlangeCount).toBe(2);
    });

    it("parses FBE as 2 flanges", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe FBE 6000 LG"]);
      expect(result.parsedFlangeCount).toBe(2);
    });

    it("parses FOE as 1 flange", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe FOE 6000 LG"]);
      expect(result.parsedFlangeCount).toBe(1);
    });

    it("returns 0 for PE", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB Pipe PE 6000 LG"]);
      expect(result.parsedFlangeCount).toBe(0);
    });
  });

  describe("flange standard and pressure class parsing", () => {
    it("parses ASME B16.5 with class", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "100NB Pipe 6000 LG, 2X R/F, ASME B16.5 150",
      ]);
      expect(result.parsedFlangeStandard).toBe("ASME B16.5");
      expect(result.parsedPressureClass).toBe("150");
    });

    it("parses SABS 1123 with table designation", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "100NB Pipe 6000 LG FBE SABS 1123 1000/3",
      ]);
      expect(result.parsedFlangeStandard).toBe("SABS 1123");
      expect(result.parsedPressureClass).toBe("1000/3");
    });
  });

  describe("flange area adds to m2", () => {
    it("flanged pipe has higher m2 than plain pipe", async () => {
      setupStandardMocks();
      const [plainResult] = await service.calculateM2ForItems(["100NB Pipe PE 6000 LG"]);
      const [flangedResult] = await service.calculateM2ForItems(["100NB Pipe FBE 6000 LG"]);
      expect(flangedResult.totalM2!).toBeGreaterThan(plainResult.totalM2!);
    });

    it("uses real flange dimensions from DB when available", async () => {
      setupStandardMocks();
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 220,
        d4: 115.0,
        b: 14,
      });

      const [result] = await service.calculateM2ForItems(["100NB Pipe FBE 6000 LG"]);
      expect(mockFlangeDimension.flangeDimensionsForM2).toHaveBeenCalledWith(100, null, null);
      expect(result.totalM2).toBeGreaterThan(0);
    });

    it("falls back to overlap allowance when DB has no flange data", async () => {
      setupStandardMocks();
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["100NB Pipe FBE 6000 LG"]);
      expect(result.totalM2).toBeGreaterThan(0);
    });

    it("passes parsed flange standard and class to lookup", async () => {
      setupStandardMocks();
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 220,
        d4: 115.0,
        b: 14,
      });

      await service.calculateM2ForItems(["100NB Pipe FBE 6000 LG ASME B16.5 150"]);
      expect(mockFlangeDimension.flangeDimensionsForM2).toHaveBeenCalledWith(
        100,
        "ASME B16.5",
        "150",
      );
    });
  });

  describe("reducer C/F dimension parsing", () => {
    it("parses C/F without mm suffix and doubles it for reducer length", async () => {
      setupStandardMocks(1219.2, 12.7);
      const [result] = await service.calculateM2ForItems([
        "1200NB x 800NB CONCENTRIC REDUCER C/F 2557",
      ]);
      expect(result.parsedItemType).toBe("reducer");
      expect(result.parsedLengthM).toBeCloseTo(5.114, 2);
    });

    it("uses explicit LG length over C/F doubling for reducer", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["100NB x 80NB REDUCER 6000 LG C/F 2000"]);
      expect(result.parsedItemType).toBe("reducer");
      expect(result.parsedLengthM).toBeCloseTo(6, 1);
    });
  });

  describe("lateral arm dimension parsing", () => {
    it("parses arm dimensions from bare format without parentheses", async () => {
      setupStandardMocks(1219.2, 12.7);
      const [result] = await service.calculateM2ForItems(["1200NB LATERAL 1597 x 1597 PE"]);
      expect(result.parsedItemType).toBe("lateral");
      expect(result.externalM2).toBeGreaterThan(0);
      expect(result.internalM2).toBeGreaterThan(0);
    });

    it("adds open-end allowance for PE lateral (3 un-flanged ends)", async () => {
      const odMm = 1219.2;
      const wallMm = 12.7;
      setupStandardMocks(odMm, wallMm);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 1500,
        d4: 1220,
        b: 50,
      });

      const [peResult] = await service.calculateM2ForItems(["1200NB LATERAL 1597 x 1597 PE"]);
      const [flangedResult] = await service.calculateM2ForItems([
        "1200NB LATERAL 1597 x 1597 3X R/F",
      ]);

      expect(peResult.totalM2!).toBeGreaterThan(0);
      const idMm = odMm - 2 * wallMm;
      const allowanceM = 0.1;
      const expectedOpenEndArea =
        3 * Math.PI * (odMm / 1000) * allowanceM + 3 * Math.PI * (idMm / 1000) * allowanceM;

      const backAnnular = (Math.PI / 4) * (1500 ** 2 - odMm ** 2);
      const faceAnnular = (Math.PI / 4) * (1500 ** 2 - 1220 ** 2);
      const boreInternal = Math.PI * (1220 / 1000) * (50 / 1000);
      const externalPerFlange = backAnnular / 1_000_000;
      const internalPerFlange = faceAnnular / 1_000_000 + boreInternal;
      const expectedFlangeArea = (externalPerFlange + internalPerFlange) * 3;

      expect(peResult.totalM2! - flangedResult.totalM2!).toBeCloseTo(
        expectedOpenEndArea - expectedFlangeArea,
        3,
      );
    });

    it("adds 1 open-end allowance for lateral with 2 flanges", async () => {
      setupStandardMocks(1219.2, 12.7);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["1200NB LATERAL 1597 x 1597 2X R/F"]);
      expect(result.totalM2!).toBeGreaterThan(0);
    });
  });

  describe("RFQ-format descriptions end-to-end", () => {
    it("parses full ASTM pipe description", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems([
        "500NB Sch 40 (9.53mm) ASTM A106 Gr B Pipe, 12.192Lg, 2X R/F, ASME B16.5 150",
      ]);
      expect(result.parsedDiameterMm).toBe(500);
      expect(result.parsedWallThicknessMm).toBe(9.53);
      expect(result.parsedFlangeCount).toBe(2);
      expect(result.parsedFlangeStandard).toBe("ASME B16.5");
      expect(result.parsedPressureClass).toBe("150");
      expect(result.parsedItemType).toBe("pipe");
      expect(result.totalM2).toBeGreaterThan(0);
    });

    it("parses full SABS 719 pipe description", async () => {
      setupStandardMocks(508.0, 6);
      const [result] = await service.calculateM2ForItems([
        "500NB W/T 6mm SABS 719 ERW Pipe, 12.192Lg",
      ]);
      expect(result.parsedDiameterMm).toBe(500);
      expect(result.parsedWallThicknessMm).toBe(6);
      expect(result.parsedLengthM).toBeCloseTo(12.192, 2);
      expect(result.totalM2).toBeGreaterThan(0);
    });

    it("parses full bend description", async () => {
      setupStandardMocks(88.9, 5.49);
      const [result] = await service.calculateM2ForItems([
        "80NB Sch 40 (5.49mm) ASTM A106 90° 3D Bend C/F 455mm FBE ASME B16.5 150",
      ]);
      expect(result.parsedDiameterMm).toBe(80);
      expect(result.parsedBendAngle).toBe(90);
      expect(result.parsedBendType).toBe("3D");
      expect(result.parsedFlangeCount).toBe(2);
      expect(result.totalM2).toBeGreaterThan(0);
    });
  });
});
