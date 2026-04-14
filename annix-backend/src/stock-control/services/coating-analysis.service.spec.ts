import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockItem } from "../entities/stock-item.entity";
import { CoatingAnalysisService } from "./coating-analysis.service";
import { M2CalculationService } from "./m2-calculation.service";

describe("CoatingAnalysisService", () => {
  let service: CoatingAnalysisService;

  const mockAnalysisRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
  };

  const mockLineItemRepo = {
    find: jest.fn(),
  };

  const mockStockItemRepo = {
    find: jest.fn(),
  };

  const mockCompanyRepo = {
    findOne: jest.fn().mockResolvedValue({ pipingLossFactorPct: 45 }),
  };

  const mockAiChatService = {
    chat: jest.fn(),
  };

  const mockM2CalculationService = {
    calculateM2ForLineItems: jest.fn().mockResolvedValue([]),
    calculateM2ForItems: jest
      .fn()
      .mockImplementation((descriptions: string[]) =>
        Promise.resolve(descriptions.map(() => ({ externalM2: 0, internalM2: 0 }))),
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoatingAnalysisService,
        { provide: getRepositoryToken(JobCardCoatingAnalysis), useValue: mockAnalysisRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardLineItem), useValue: mockLineItemRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StockControlCompany), useValue: mockCompanyRepo },
        {
          provide: getRepositoryToken(CustomerPurchaseOrder),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(JobCardExtractionCorrection),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: M2CalculationService, useValue: mockM2CalculationService },
        {
          provide: STORAGE_SERVICE,
          useValue: { upload: jest.fn(), download: jest.fn(), presignedUrl: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CoatingAnalysisService>(CoatingAnalysisService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateCoatVolume (via analyseJobCard)", () => {
    function setupForCoatVolumeTest(coats: unknown[]) {
      mockAnalysisRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, notes: "EXT: PAINT @ 240-250um" });
      mockLineItemRepo.find.mockResolvedValue([{ itemCode: "paint", m2: 100 }]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          applicationType: "external",
          surfacePrep: "blast",
          coats,
        }),
      });
    }

    it("calculates coverageM2PerLiter using midDft and solids", async () => {
      setupForCoatVolumeTest([
        {
          product: "TEST PAINT",
          genericType: "epoxy",
          area: "external",
          minDftUm: 240,
          maxDftUm: 260,
          solidsByVolumePercent: 70,
        },
      ]);

      const result = await service.analyseJobCard(1, 1);
      const coat = result.coats[0];

      const midDft = (240 + 260) / 2;
      const expectedCoverage = ((70 * 10) / midDft) * 0.55;
      expect(coat.coverageM2PerLiter).toBeCloseTo(expectedCoverage, 2);
    });

    it("calculates litersRequired with ceil rounding to 0.1", async () => {
      setupForCoatVolumeTest([
        {
          product: "TEST PAINT",
          genericType: "epoxy",
          area: "external",
          minDftUm: 200,
          maxDftUm: 200,
          solidsByVolumePercent: 60,
        },
      ]);

      const result = await service.analyseJobCard(1, 1);
      const coat = result.coats[0];

      const coverage = ((60 * 10) / 200) * 0.55;
      const expectedLitres = Math.ceil((100 / coverage) * 10) / 10;
      expect(coat.litersRequired).toBeCloseTo(expectedLitres, 1);
    });

    it("uses default 60% solids when solidsByVolumePercent is 0", async () => {
      setupForCoatVolumeTest([
        {
          product: "TEST PAINT",
          genericType: "unknown",
          area: "external",
          minDftUm: 200,
          maxDftUm: 200,
          solidsByVolumePercent: 0,
        },
      ]);

      const result = await service.analyseJobCard(1, 1);
      const coat = result.coats[0];

      const expectedCoverage = ((60 * 10) / 200) * 0.55;
      expect(coat.coverageM2PerLiter).toBeCloseTo(expectedCoverage, 2);
    });

    it("falls back to default DFT when midDft is 0 and product is unknown", async () => {
      setupForCoatVolumeTest([
        {
          product: "TEST PAINT",
          genericType: "epoxy",
          area: "external",
          minDftUm: 0,
          maxDftUm: 0,
          solidsByVolumePercent: 70,
        },
      ]);

      const result = await service.analyseJobCard(1, 1);
      const coat = result.coats[0];

      const defaultDft = 125;
      const expectedCoverage = ((70 * 10) / defaultDft) * 0.55;
      expect(coat.coverageM2PerLiter).toBeCloseTo(expectedCoverage, 2);
      expect(coat.litersRequired).toBeGreaterThan(0);
    });
  });

  describe("sumPaintM2 (via analyseJobCard)", () => {
    it("sums m2 only from items with 'paint' in itemCode", async () => {
      mockAnalysisRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, notes: "EXT: PAINT" });
      mockLineItemRepo.find.mockResolvedValue([
        { itemCode: "paint", m2: 50 },
        { itemCode: "Paint External", m2: 30 },
        { itemCode: "steel pipe", m2: 100 },
      ]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          applicationType: "external",
          surfacePrep: null,
          coats: [
            {
              product: "P",
              genericType: "epoxy",
              area: "external",
              minDftUm: 100,
              maxDftUm: 100,
              solidsByVolumePercent: 60,
            },
          ],
        }),
      });

      const result = await service.analyseJobCard(1, 1);
      expect(result.extM2).toBe(180);
    });

    it("handles null m2 values", async () => {
      mockAnalysisRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, notes: "EXT: PAINT" });
      mockLineItemRepo.find.mockResolvedValue([
        { itemCode: "paint", m2: null },
        { itemCode: "paint 2", m2: 20 },
      ]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          applicationType: "external",
          surfacePrep: null,
          coats: [
            {
              product: "P",
              genericType: "epoxy",
              area: "external",
              minDftUm: 100,
              maxDftUm: 100,
              solidsByVolumePercent: 60,
            },
          ],
        }),
      });

      const result = await service.analyseJobCard(1, 1);
      expect(result.extM2).toBe(20);
    });
  });

  describe("fuzzy stock matching (via assessStock)", () => {
    function setupForStockMatch(stockItems: { id: number; name: string; quantity: number }[]) {
      mockAnalysisRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, notes: "EXT: PAINT" });
      mockLineItemRepo.find.mockResolvedValue([{ itemCode: "paint", m2: 10 }]);
      mockStockItemRepo.find.mockResolvedValue(stockItems);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          applicationType: "external",
          surfacePrep: null,
          coats: [
            {
              product: "PENGUARD EXPRESS MIO BUFF",
              genericType: "epoxy_mio",
              area: "external",
              minDftUm: 200,
              maxDftUm: 200,
              solidsByVolumePercent: 65,
            },
          ],
        }),
      });
    }

    it("finds exact match", async () => {
      setupForStockMatch([{ id: 1, name: "PENGUARD EXPRESS MIO BUFF", quantity: 100 }]);
      const result = await service.analyseJobCard(1, 1);
      expect(result.stockAssessment[0].stockItemId).toBe(1);
      expect(result.stockAssessment[0].sufficient).toBe(true);
    });

    it("finds partial word match with >= 50% words matching", async () => {
      setupForStockMatch([{ id: 2, name: "PENGUARD EXPRESS MIO RED", quantity: 100 }]);
      const result = await service.analyseJobCard(1, 1);
      expect(result.stockAssessment[0].stockItemId).toBe(2);
    });

    it("returns null match when < 50% words match", async () => {
      setupForStockMatch([{ id: 3, name: "HARDTOP XP BLUE", quantity: 100 }]);
      const result = await service.analyseJobCard(1, 1);
      expect(result.stockAssessment[0].stockItemId).toBeNull();
      expect(result.stockAssessment[0].sufficient).toBe(false);
    });

    it("sets sufficient flag based on quantity vs required", async () => {
      setupForStockMatch([{ id: 1, name: "PENGUARD EXPRESS MIO BUFF", quantity: 0.1 }]);
      const result = await service.analyseJobCard(1, 1);
      expect(result.stockAssessment[0].sufficient).toBe(false);
    });
  });

  describe("analyseJobCard edge cases", () => {
    it("returns existing analysis if one already exists", async () => {
      const existing = {
        id: 99,
        jobCardId: 1,
        companyId: 1,
        status: CoatingAnalysisStatus.ANALYSED,
      };
      mockAnalysisRepo.findOne.mockResolvedValue(existing);
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, notes: "EXT: PAINT" });
      mockLineItemRepo.find.mockResolvedValue([]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockAiChatService.chat.mockResolvedValue({
        content: '{"applicationType":"external","surfacePrep":null,"coats":[]}',
      });

      const result = await service.analyseJobCard(1, 1);
      expect(result.status).toBe(CoatingAnalysisStatus.ANALYSED);
    });

    it("marks analysis as failed when job card not found", async () => {
      mockAnalysisRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.findOne.mockResolvedValue(null);

      const result = await service.analyseJobCard(1, 1);
      expect(result.status).toBe(CoatingAnalysisStatus.FAILED);
    });
  });
});
