import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { RequisitionService } from "./requisition.service";

describe("RequisitionService", () => {
  let service: RequisitionService;

  const mockRequisitionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockItemRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((items) => Promise.resolve(items)),
    findOne: jest.fn(),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
  };

  const mockAnalysisRepo = {
    findOne: jest.fn(),
  };

  const mockStockItemRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequisitionService,
        { provide: getRepositoryToken(Requisition), useValue: mockRequisitionRepo },
        { provide: getRepositoryToken(RequisitionItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardCoatingAnalysis), useValue: mockAnalysisRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
      ],
    }).compile();

    service = module.get<RequisitionService>(RequisitionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createFromJobCard", () => {
    it("returns existing requisition if one already exists", async () => {
      const existing = { id: 99, requisitionNumber: "REQ-JC001" };
      mockRequisitionRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBe(existing);
      expect(mockRequisitionRepo.create).not.toHaveBeenCalled();
    });

    it("returns null when no coating analysis exists", async () => {
      mockRequisitionRepo.findOne.mockResolvedValueOnce(null);
      mockAnalysisRepo.findOne.mockResolvedValue(null);

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBeNull();
    });

    it("returns null when analysis has 0 coats", async () => {
      mockRequisitionRepo.findOne.mockResolvedValueOnce(null);
      mockAnalysisRepo.findOne.mockResolvedValue({ coats: [] });

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBeNull();
    });

    it("returns null when job card not found", async () => {
      mockRequisitionRepo.findOne.mockResolvedValueOnce(null);
      mockAnalysisRepo.findOne.mockResolvedValue({
        coats: [{ product: "Paint", litersRequired: 10 }],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue(null);

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBeNull();
    });

    it("creates requisition with REQ-{jobNumber} format", async () => {
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });
      mockAnalysisRepo.findOne.mockResolvedValue({
        coats: [{ product: "Paint", litersRequired: 10, area: "external" }],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, jobNumber: "JC-001" });

      await service.createFromJobCard(1, 1, "admin");

      expect(mockRequisitionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requisitionNumber: "REQ-JC-001",
          status: RequisitionStatus.PENDING,
        }),
      );
    });

    it("creates one item per coat", async () => {
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });
      mockAnalysisRepo.findOne.mockResolvedValue({
        coats: [
          { product: "Primer", litersRequired: 10, area: "external" },
          { product: "Topcoat", litersRequired: 20, area: "external" },
        ],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, jobNumber: "JC-001" });

      await service.createFromJobCard(1, 1, "admin");

      expect(mockItemRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("pack size calculations", () => {
    function setupForPackSize(litres: number) {
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });
      mockAnalysisRepo.findOne.mockResolvedValue({
        coats: [{ product: "Paint", litersRequired: litres, area: "external" }],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, jobNumber: "JC-001" });
    }

    it("calculates packsToOrder as ceil(litres / 20) for 0.5L", async () => {
      setupForPackSize(0.5);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ packsToOrder: 1 }),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for 21L", async () => {
      setupForPackSize(21);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ packsToOrder: 2 }),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for 68.6L", async () => {
      setupForPackSize(68.6);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ packsToOrder: 4 }),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for exact 20L", async () => {
      setupForPackSize(20);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ packsToOrder: 1 }),
      );
    });
  });

  describe("createReorderRequisition", () => {
    it("returns null when stock item not found", async () => {
      mockStockItemRepo.findOne.mockResolvedValue(null);
      const result = await service.createReorderRequisition(1, 999);
      expect(result).toBeNull();
    });

    it("returns null when minStockLevel is 0", async () => {
      mockStockItemRepo.findOne.mockResolvedValue({
        id: 1,
        sku: "PAINT-001",
        name: "Paint",
        quantity: 0,
        minStockLevel: 0,
      });
      const result = await service.createReorderRequisition(1, 1);
      expect(result).toBeNull();
    });

    it("returns null when stock is above minimum", async () => {
      mockStockItemRepo.findOne.mockResolvedValue({
        id: 1,
        sku: "PAINT-001",
        name: "Paint",
        quantity: 50,
        minStockLevel: 20,
      });
      const result = await service.createReorderRequisition(1, 1);
      expect(result).toBeNull();
    });

    it("calculates deficit correctly", async () => {
      mockStockItemRepo.findOne.mockResolvedValue({
        id: 1,
        sku: "PAINT-001",
        name: "Paint",
        quantity: 5,
        minStockLevel: 20,
      });
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });

      await service.createReorderRequisition(1, 1);

      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantityRequired: 15 }),
      );
    });

    it("uses REORDER-{sku} format", async () => {
      mockStockItemRepo.findOne.mockResolvedValue({
        id: 1,
        sku: "PAINT-001",
        name: "Paint",
        quantity: 5,
        minStockLevel: 20,
      });
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });

      await service.createReorderRequisition(1, 1);

      expect(mockRequisitionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requisitionNumber: "REORDER-PAINT-001",
          source: RequisitionSource.REORDER,
        }),
      );
    });
  });
});
