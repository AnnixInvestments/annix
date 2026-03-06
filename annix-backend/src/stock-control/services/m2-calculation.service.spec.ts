import { Test, TestingModule } from "@nestjs/testing";
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M2CalculationService,
        { provide: NbOdLookupService, useValue: mockNbOdLookup },
        { provide: PipeScheduleService, useValue: mockPipeSchedule },
        { provide: NixItemParserService, useValue: mockNixItemParser },
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
});
