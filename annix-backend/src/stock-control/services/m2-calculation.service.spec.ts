import { Test, TestingModule } from "@nestjs/testing";
import { FlangeDimensionService } from "../../flange-dimension/flange-dimension.service";
import { NbOdLookupService } from "../../nb-od-lookup/nb-od-lookup.service";
import { NixItemParserService } from "../../nix/services/nix-item-parser.service";
import { PipeScheduleService } from "../../pipe-schedule/pipe-schedule.service";
import type { TankComponent, TankComponentShape } from "../entities/job-card-line-item.entity";
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

  describe("FAE (Flanged All Ends) recognition", () => {
    it("parses FAE as 3 flanges", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);
      expect(result.parsedFlangeCount).toBe(3);
    });

    it("parses FAE flange config as all_ends", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);
      expect(result.parsedFlangeConfig).toBe("all_ends");
    });

    it("includes flange area in m2 for FAE items", async () => {
      setupStandardMocks(406.4, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 580,
        d4: 407,
        b: 30,
      });

      const [withFae] = await service.calculateM2ForItems(["400NB TEE 810x405 FAE 1000/3"]);

      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);
      const [withoutFlange] = await service.calculateM2ForItems(["400NB TEE 810x405 PE"]);

      expect(withFae.externalM2!).toBeGreaterThan(withoutFlange.externalM2!);
    });
  });

  describe("RED/TEE (reducing tee) recognition", () => {
    it("parses RED/TEE as reducing_tee fitting type", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);
      expect(result.parsedFittingType).toBe("reducing_tee");
      expect(result.parsedItemType).toBe("tee");
    });

    it("parses REDUCING TEE with space separator", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems([
        "400x150NB 810x405 REDUCING TEE FAE 1000/3",
      ]);
      expect(result.parsedFittingType).toBe("reducing_tee");
    });

    it("parses main and branch diameter from reducing NB pattern", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);
      expect(result.parsedDiameterMm).toBe(400);
    });

    it("uses branch OD for reducing tee branch area", async () => {
      const mainOd = 406.4;
      const mainWt = 9.53;
      const branchOd = 168.3;
      const branchWt = 7.11;

      mockNbOdLookup.nbToOd
        .mockResolvedValueOnce({ outsideDiameterMm: mainOd })
        .mockResolvedValueOnce({ outsideDiameterMm: branchOd });
      mockPipeSchedule.getSchedulesByNbMm
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: mainWt }])
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: branchWt }]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE PE"]);

      expect(result.externalM2).toBeGreaterThan(0);
      expect(mockNbOdLookup.nbToOd).toHaveBeenCalledTimes(2);
    });
  });

  describe("reducer with branch diameter", () => {
    it("uses actual branch OD for small end instead of 0.7 estimate", async () => {
      const mainOd = 406.4;
      const mainWt = 9.53;
      const branchOd = 219.1;
      const branchWt = 8.18;

      mockNbOdLookup.nbToOd
        .mockResolvedValueOnce({ outsideDiameterMm: mainOd })
        .mockResolvedValueOnce({ outsideDiameterMm: branchOd });
      mockPipeSchedule.getSchedulesByNbMm
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: mainWt }])
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: branchWt }]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["400x200NB CONCENTRIC REDUCER C/F 500"]);

      expect(result.parsedItemType).toBe("reducer");
      expect(result.externalM2).toBeGreaterThan(0);

      // Costing is taken off the larger end (400NB), not the average of the two ends.
      const largeOd = Math.max(mainOd, branchOd);
      const lengthM = 1.0;
      const expectedExt = Math.PI * (largeOd / 1000) * lengthM;
      expect(result.externalM2).toBeCloseTo(expectedExt, 2);
    });
  });

  describe("blank/blind flange m2", () => {
    it("calculates m2 for blank flange with dimension data", async () => {
      setupStandardMocks(323.9, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 440,
        d4: 325,
        b: 24,
      });

      const [result] = await service.calculateM2ForItems(["300NB BLANK FLANGE SABS 1123 1000/3"]);

      expect(result.parsedItemType).toBe("flange");
      expect(result.parsedFlangeConfig).toBe("blank_flange");
      expect(result.parsedFlangeCount).toBe(1);
      expect(result.externalM2).toBeGreaterThan(0);

      const flangeOd = 440;
      const boreMm = 0;
      const thickness = 24;
      const faceArea = ((Math.PI / 4) * (flangeOd ** 2 - boreMm ** 2)) / 1_000_000;
      const edgeArea = Math.PI * (flangeOd / 1000) * (thickness / 1000);
      expect(result.externalM2).toBeCloseTo(faceArea + edgeArea, 3);
    });

    it("uses zero bore for blank flange (solid disc)", async () => {
      setupStandardMocks(323.9, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 440,
        d4: 325,
        b: 24,
      });

      const [blankResult] = await service.calculateM2ForItems(["300NB BLANK FLANGE 1000/3"]);

      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 440,
        d4: 325,
        b: 24,
      });

      const [blindResult] = await service.calculateM2ForItems(["300NB BLIND FLANGE 1000/3"]);

      expect(blankResult.externalM2).toBeCloseTo(blindResult.externalM2!, 4);
      expect(blankResult.externalM2!).toBeGreaterThan(0);
    });

    it("falls back to pipe OD estimate when no dimension data", async () => {
      setupStandardMocks(323.9, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["300NB BLANK FLANGE ASME B16.5 150"]);

      expect(result.parsedItemType).toBe("flange");
      expect(result.externalM2).toBeGreaterThan(0);
    });

    it("blank flange has larger face area than regular flange (no bore subtracted)", async () => {
      setupStandardMocks(323.9, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 440,
        d4: 325,
        b: 24,
      });

      const [blankResult] = await service.calculateM2ForItems(["300NB BLANK FLANGE 1000/3"]);

      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({
        D: 440,
        d4: 325,
        b: 24,
      });

      const flangeOd = 440;
      const bore = 325;
      const thickness = 24;
      const regularFace = ((Math.PI / 4) * (flangeOd ** 2 - bore ** 2)) / 1_000_000;
      const blankFace = ((Math.PI / 4) * flangeOd ** 2) / 1_000_000;
      const edgeArea = Math.PI * (flangeOd / 1000) * (thickness / 1000);

      expect(blankResult.externalM2).toBeCloseTo(blankFace + edgeArea, 3);
      expect(blankResult.externalM2!).toBeGreaterThan(regularFace + edgeArea);
    });
  });

  describe("SABS pressure class parsing", () => {
    it("parses 1000/3 as SABS 1123 pressure class", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400NB PIPE FBE 1000/3 6000 LG"]);
      expect(result.parsedFlangeStandard).toBe("SABS 1123");
      expect(result.parsedPressureClass).toBe("1000");
    });

    it("parses 1600/3 as SABS 1123 pressure class", async () => {
      setupStandardMocks(508.0, 9.53);
      const [result] = await service.calculateM2ForItems(["500NB 90° BEND FBE 1600/3 C/F 1020"]);
      expect(result.parsedFlangeStandard).toBe("SABS 1123");
      expect(result.parsedPressureClass).toBe("1600");
    });
  });

  describe("JC #86 real-world descriptions", () => {
    it("item 1: 400x150NB RED/TEE with FAE", async () => {
      mockNbOdLookup.nbToOd
        .mockResolvedValueOnce({ outsideDiameterMm: 406.4 })
        .mockResolvedValueOnce({ outsideDiameterMm: 168.3 });
      mockPipeSchedule.getSchedulesByNbMm
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: 9.53 }])
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: 7.11 }]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);

      expect(result.parsedDiameterMm).toBe(400);
      expect(result.parsedItemType).toBe("tee");
      expect(result.parsedFittingType).toBe("reducing_tee");
      expect(result.parsedFlangeCount).toBe(3);
      expect(result.parsedFlangeConfig).toBe("all_ends");
      expect(result.parsedFlangeStandard).toBe("SABS 1123");
      expect(result.externalM2).toBeGreaterThan(1.5);
    });

    it("item 2: 500x50NB RED/TEE with FAE", async () => {
      mockNbOdLookup.nbToOd
        .mockResolvedValueOnce({ outsideDiameterMm: 508.0 })
        .mockResolvedValueOnce({ outsideDiameterMm: 60.3 });
      mockPipeSchedule.getSchedulesByNbMm
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: 9.53 }])
        .mockResolvedValueOnce([{ schedule: "Std", wallThicknessMm: 3.91 }]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["500x50NB 485x394 RED/TEE FAE 1600/3"]);

      expect(result.parsedDiameterMm).toBe(500);
      expect(result.parsedItemType).toBe("tee");
      expect(result.parsedFittingType).toBe("reducing_tee");
      expect(result.parsedFlangeCount).toBe(3);
      expect(result.externalM2).toBeGreaterThan(1.0);
    });

    it("item 3: 500NB 90° BEND with FBE and C/F", async () => {
      mockNbOdLookup.nbToOd.mockResolvedValue({ outsideDiameterMm: 508.0 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([
        { schedule: "Std", wallThicknessMm: 9.53 },
      ]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["500NB 90° BEND FBE 1600/3 C/F 1020"]);

      expect(result.parsedDiameterMm).toBe(500);
      expect(result.parsedItemType).toBe("bend");
      expect(result.parsedBendAngle).toBe(90);
      expect(result.parsedFlangeCount).toBe(2);
      expect(result.parsedFlangeConfig).toBe("both_ends");

      const cfTotal = 1020 * 2;
      const expectedBodyExt = Math.PI * (508.0 / 1000) * (cfTotal / 1000);
      expect(result.externalM2).toBeGreaterThan(expectedBodyExt * 0.95);
      expect(result.externalM2).toBeGreaterThan(3.0);
    });
  });

  describe("LYCO patterns: 3+ bore lists, FnE flanges, CON RED reducers", () => {
    it("takes the FIRST bore as the main run for 3-bore lists (350x80x50NB)", async () => {
      setupStandardMocks(355.6, 9.53);
      const [result] = await service.calculateM2ForItems(["350x80x50NB 1701x847 LATERAL F4E"]);
      expect(result.parsedDiameterMm).toBe(350);
      expect(result.parsedItemType).toBe("lateral");
    });

    it("parses F4E as 4 flanged ends", async () => {
      setupStandardMocks(355.6, 9.53);
      const [result] = await service.calculateM2ForItems(["350x80x50NB 1701x847 LATERAL F4E"]);
      expect(result.parsedFlangeCount).toBe(4);
    });

    it("parses F3E as 3 flanged ends", async () => {
      setupStandardMocks(355.6, 9.53);
      const [result] = await service.calculateM2ForItems(["350x200x50NB 47° BEND F3E C/F 500"]);
      expect(result.parsedFlangeCount).toBe(3);
    });

    it("still parses 2-bore lists with the first as main (regression)", async () => {
      setupStandardMocks(406.4, 9.53);
      const [result] = await service.calculateM2ForItems(["400x150NB 810x405 RED/TEE FAE 1000/3"]);
      expect(result.parsedDiameterMm).toBe(400);
      expect(result.parsedItemType).toBe("tee");
    });

    it("recognises 'CON RED' abbreviation as a concentric reducer", async () => {
      setupStandardMocks(355.6, 9.53);
      const [result] = await service.calculateM2ForItems(["350NB 180 OD 769LG CON RED FOE"]);
      expect(result.parsedItemType).toBe("reducer");
      expect(result.parsedFittingType).toBe("concentric_reducer");
      expect(result.parsedDiameterMm).toBe(350);
      expect(result.parsedLengthM).toBeCloseTo(0.769, 2);
      expect(result.externalM2).toBeGreaterThan(0);
    });

    it("costs a reducer off its larger end (same area as a full-bore pipe of that size)", async () => {
      setupStandardMocks(355.6, 9.53);
      const [reducer] = await service.calculateM2ForItems(["350NB 180 OD 769LG CON RED PE"]);
      const [pipe] = await service.calculateM2ForItems(["350NB 769LG PIPE PE"]);
      // Costing is taken off the larger end (350NB), so a 350->180 reducer body costs the
      // same area as a straight 350 pipe of the same length.
      expect(reducer.parsedItemType).toBe("reducer");
      expect(reducer.externalM2!).toBeCloseTo(pipe.externalM2!, 3);
    });

    it("recognises 'ECC/REDUCERS' abbreviation as a reducer", async () => {
      setupStandardMocks(508.0, 9.53);
      const [result] = await service.calculateM2ForItems([
        "600x500NB  400LG ECC/REDUCERS FBE 1000/3",
      ]);
      expect(result.parsedItemType).toBe("reducer");
    });

    it("looks up and includes BOTH branches on a multi-branch lateral (350x80x50)", async () => {
      mockNbOdLookup.nbToOd
        .mockResolvedValueOnce({ outsideDiameterMm: 355.6 }) // main run
        .mockResolvedValueOnce({ outsideDiameterMm: 88.9 }) // 80NB branch
        .mockResolvedValueOnce({ outsideDiameterMm: 60.3 }); // 50NB branch
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([
        { schedule: "Std", wallThicknessMm: 9.53 },
      ]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["350x80x50NB 1701x847 LATERAL F4E"]);

      expect(result.parsedItemType).toBe("lateral");
      expect(result.parsedFlangeCount).toBe(4);
      // main run + 80NB branch + 50NB branch = three OD lookups
      expect(mockNbOdLookup.nbToOd).toHaveBeenCalledTimes(3);
      expect(result.externalM2).toBeGreaterThan(0);
      expect(result.internalM2).toBeGreaterThan(0);
    });

    it("recognises plural fitting words ('BENDS') so the bend still gets m2", async () => {
      setupStandardMocks(168.3, 7.11);
      const [result] = await service.calculateM2ForItems(["150NB 90° BENDS FBE 1000/3 C/F 235"]);
      expect(result.parsedItemType).toBe("bend");
      expect(result.parsedFlangeCount).toBe(2);
      expect(result.error).toBeNull();
      expect(result.externalM2).toBeGreaterThan(0);
    });

    it("recognises plural 'PIPES' and 'SPOOLS'", async () => {
      setupStandardMocks(355.6, 9.53);
      const [pipes] = await service.calculateM2ForItems(["350NB 5994LG PIPES FOE"]);
      expect(pipes.parsedItemType).toBe("pipe");
      expect(pipes.externalM2).toBeGreaterThan(0);
    });

    it("uses an explicit m² typed in the description as a manual override", async () => {
      setupStandardMocks();
      const [result] = await service.calculateM2ForItems(["FAN IMPELLER @ 13.7m²"]);
      expect(result.externalM2).toBe(13.7);
      expect(result.internalM2).toBe(13.7);
      expect(result.confidence).toBe(1);
      expect(result.error).toBeNull();
      // never reaches the geometric path
      expect(mockNbOdLookup.nbToOd).not.toHaveBeenCalled();
    });

    it("accepts 'm2' spelling for the manual override and ignores microns", async () => {
      setupStandardMocks();
      const [m2] = await service.calculateM2ForItems(["ODD SHAPE 42 m2"]);
      expect(m2.externalM2).toBe(42);
      // microns must NOT be read as an area
      const [microns] = await service.calculateM2ForItems(["100NB 6000LG PIPE @ 150µm"]);
      expect(microns.parsedItemType).toBe("pipe");
    });

    it("computes plural 'BLANK FLANGES' (no length) with SABS class", async () => {
      setupStandardMocks(355.6, 9.53);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({ D: 580, d4: 410, b: 40 });
      const [result] = await service.calculateM2ForItems(["350NB 2500/8 BLANK FLANGES"]);
      expect(result.parsedItemType).toBe("flange");
      expect(result.parsedFlangeConfig).toBe("blank_flange");
      expect(result.parsedFlangeCount).toBe(1);
      expect(result.parsedFlangeStandard).toBe("SABS 1123");
      expect(result.parsedPressureClass).toBe("2500");
      expect(result.error).toBeNull();
      expect(result.externalM2).toBeGreaterThan(0);
    });
  });

  describe("reducer larger-end costing, FEB flanges, and no-NB reducing tee", () => {
    const perNbOd = (map: Record<number, number>) =>
      mockNbOdLookup.nbToOd.mockImplementation((nb: number) =>
        Promise.resolve({ outsideDiameterMm: map[nb] ?? nb }),
      );

    it("uses the larger end (not the average) for reducer costing m2", async () => {
      perNbOd({ 200: 219.1, 100: 114.3 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["200x100NB 400LG ECC REDUCER PE"]);

      expect(result.parsedItemType).toBe("reducer");
      // Larger end = 200NB (219.1mm OD), L = 0.4m.
      expect(result.externalM2!).toBeCloseTo(Math.PI * (219.1 / 1000) * 0.4, 3);
    });

    it("recognises FEB as 2 flanges (FBE typo) and adds the flange area", async () => {
      perNbOd({ 200: 219.1, 100: 114.3 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue({ D: 340, d4: 222, b: 24 });

      const [feb] = await service.calculateM2ForItems(["200x100NB 400LG ECC REDUCER FEB 1000/3"]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);
      const [plain] = await service.calculateM2ForItems(["200x100NB 400LG ECC REDUCER PE"]);

      expect(feb.parsedFlangeCount).toBe(2);
      expect(feb.parsedFlangeConfig).toBe("both_ends");
      expect(feb.externalM2!).toBeGreaterThan(plain.externalM2!);
    });

    it("parses a no-NB reducing T-piece as run length x branch length with its branch bore", async () => {
      perNbOd({ 350: 355.6, 200: 219.1 });
      mockPipeSchedule.getSchedulesByNbMm.mockResolvedValue([]);
      mockFlangeDimension.flangeDimensionsForM2.mockResolvedValue(null);

      const [result] = await service.calculateM2ForItems(["350x200 710x355 SPIGOT T-PIECE PE"]);

      expect(result.parsedItemType).toBe("tee");
      expect(result.parsedDiameterMm).toBe(350);
      // Run = OD(350NB) x 0.710 run length; branch = OD(200NB) x 0.355 branch length.
      const run = Math.PI * (355.6 / 1000) * 0.71;
      const branch = Math.PI * (219.1 / 1000) * 0.355;
      expect(result.externalM2!).toBeCloseTo(run + branch, 2);
    });
  });

  describe("calculateTankM2 (geometric tank surface area)", () => {
    const tc = (
      mark: string,
      componentType: TankComponent["componentType"],
      shape: TankComponentShape,
      liningThicknessMm: number | null,
      quantity = 1,
    ): TankComponent => ({
      mark,
      description: mark,
      componentType,
      shape,
      liningType: liningThicknessMm ? "SANS 1198 40 Shore A" : null,
      liningThicknessMm,
      liningAreaM2: null,
      coatingAreaM2: null,
      quantity,
      segmentCount: null,
    });

    it("computes a dished head as the 1.07·D² envelope (matches printed lid area)", () => {
      const result = service.calculateTankM2([
        tc(
          "LID",
          "dished_head",
          { type: "dished_head", crownRadiusMm: 642, knuckleRadiusMm: 45, outerDiameterMm: 750 },
          6,
        ),
      ]);
      // 1.07 · 750² / 1e6 = 0.602 m² (drawing prints 0.6).
      expect(result.externalM2).toBeCloseTo(0.602, 2);
      expect(result.internalM2).toBeCloseTo(0.602, 2);
    });

    it("sums shell + cone + ring and only counts lining on lined components", () => {
      const result = service.calculateTankM2([
        tc("SHELL", "shell", { type: "cylinder", innerDiameterMm: 1000, heightMm: 1000 }, 6),
        tc(
          "CONE",
          "cone",
          {
            type: "cone",
            largeDiameterMm: 1000,
            smallDiameterMm: 450,
            slantHeightMm: 800,
            sweepAngleDegrees: null,
          },
          6,
        ),
        tc(
          "LEG-RING",
          "ring",
          { type: "annular_ring", outerDiameterMm: 1100, innerDiameterMm: 1000 },
          null,
        ),
      ]);
      const shell = Math.PI * 1.0 * 1.0; // 3.1416
      const cone = Math.PI * ((1.0 + 0.45) / 2) * 0.8; // 1.8221
      const ring = (Math.PI / 4) * (1.1 * 1.1 - 1.0 * 1.0); // 0.1649
      expect(result.externalM2).toBeCloseTo(shell + cone + ring, 2);
      // ring is unlined → lining excludes it.
      expect(result.internalM2).toBeCloseTo(shell + cone, 2);
      expect(result.usableComponents).toBe(3);
    });

    it("quantity-expands components and ignores dimensionless ones", () => {
      const result = service.calculateTankM2([
        tc(
          "ARM",
          "branch",
          { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355, mitred: false },
          6,
          10,
        ),
        tc("BAD", "plate", { type: "rectangle", widthMm: 0, heightMm: 0 }, 6),
      ]);
      const arm = Math.PI * 0.2 * 0.355 * 10;
      expect(result.externalM2).toBeCloseTo(arm, 2);
      expect(result.usableComponents).toBe(1);
    });

    it("returns zeros for null/empty components", () => {
      expect(service.calculateTankM2(null)).toEqual({
        externalM2: 0,
        internalM2: 0,
        components: [],
        usableComponents: 0,
      });
    });

    it("ignores a component with a non-finite dimension so it cannot corrupt the m² sum", () => {
      const result = service.calculateTankM2([
        tc(
          "BAD",
          "shell",
          { type: "cylinder", innerDiameterMm: Number.POSITIVE_INFINITY, heightMm: 1000 },
          6,
        ),
        tc("OK", "shell", { type: "cylinder", innerDiameterMm: 1000, heightMm: 1000 }, 6),
      ]);
      expect(result.usableComponents).toBe(1);
      expect(result.externalM2).toBeCloseTo(Math.PI * 1.0 * 1.0, 2);
      expect(Number.isFinite(result.externalM2)).toBe(true);
    });

    it("computes a branch-wrap component as π·bore·length", () => {
      const result = service.calculateTankM2([
        tc(
          "ARM",
          "branch",
          { type: "branch_wrap", boreDiameterMm: 200, lengthMm: 355, mitred: false },
          6,
        ),
      ]);
      expect(result.externalM2).toBeCloseTo(Math.PI * 0.2 * 0.355, 3);
      expect(result.internalM2).toBeCloseTo(Math.PI * 0.2 * 0.355, 3);
    });

    // A swapped/garbage small>large pair must NOT inflate the geometric m²: the
    // backend clamps smallDiameter <= largeDiameter (matching the frontend
    // developTankComponent) before averaging.
    it("clamps a cone whose small end exceeds the large end (no inflated dAvg)", () => {
      const result = service.calculateTankM2([
        tc(
          "CONE-SWAP",
          "cone",
          {
            type: "cone",
            largeDiameterMm: 300,
            smallDiameterMm: 900,
            slantHeightMm: 500,
            sweepAngleDegrees: null,
          },
          6,
        ),
      ]);
      // small clamped to large (0.3) → dAvg = 0.3, not the inflated 0.6.
      expect(result.externalM2).toBeCloseTo(Math.PI * 0.3 * 0.5, 2);
    });
  });
});
