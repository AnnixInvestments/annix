import { Test, TestingModule } from "@nestjs/testing";
import { RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { RequisitionRepository } from "../repositories/requisition.repository";
import { RequisitionItemRepository } from "../repositories/requisition-item.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { RequisitionService } from "./requisition.service";

describe("RequisitionService", () => {
  let service: RequisitionService;

  const reqFindOne = jest.fn();
  const reqCount = jest.fn().mockResolvedValue(0);
  const mockRequisitionRepo = {
    findOne: reqFindOne,
    findActiveForJobCard: reqFindOne,
    findActiveForJobCardWithItems: reqFindOne,
    findOneForCompanyWithDetails: reqFindOne,
    findOneForCompanyWithItems: reqFindOne,
    findByExactNumber: reqFindOne,
    findActiveReorderByNumber: reqFindOne,
    findForCpo: reqFindOne,
    findCalloffForCpo: reqFindOne,
    findAllForCompanyPaginated: jest.fn(),
    count: reqCount,
    countByNumberPrefix: reqCount,
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const itemSave = jest.fn().mockImplementation((items) => Promise.resolve(items));
  const itemFindOne = jest.fn();
  const mockItemRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    buildMany: jest.fn().mockImplementation((rows) => rows.map((r: object) => ({ ...r }))),
    save: itemSave,
    saveMany: itemSave,
    findOne: itemFindOne,
    findOneForCompanyWithStockItem: itemFindOne,
    findOneForRequisition: itemFindOne,
  };

  const jobCardFindOne = jest.fn();
  const mockJobCardRepo = {
    findOne: jobCardFindOne,
    findOneForCompany: jobCardFindOne,
  };

  const mockAnalysisRepo = {
    findOneForJobCard: jest.fn(),
  };

  const mockStockItemRepo = {
    findOneForCompany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequisitionService,
        { provide: RequisitionRepository, useValue: mockRequisitionRepo },
        { provide: RequisitionItemRepository, useValue: mockItemRepo },
        { provide: JobCardRepository, useValue: mockJobCardRepo },
        { provide: JobCardCoatingAnalysisRepository, useValue: mockAnalysisRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
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
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBeNull();
    });

    it("returns null when analysis has 0 coats", async () => {
      mockRequisitionRepo.findOne.mockResolvedValueOnce(null);
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue({ coats: [] });

      const result = await service.createFromJobCard(1, 1, "admin");
      expect(result).toBeNull();
    });

    it("returns null when job card not found", async () => {
      mockRequisitionRepo.findOne.mockResolvedValueOnce(null);
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue({
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
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue({
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
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue({
        coats: [
          { product: "Primer", litersRequired: 10, area: "external" },
          { product: "Topcoat", litersRequired: 20, area: "external" },
        ],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, jobNumber: "JC-001" });

      await service.createFromJobCard(1, 1, "admin");

      expect(mockItemRepo.buildMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ productName: "Primer" }),
          expect.objectContaining({ productName: "Topcoat" }),
        ]),
      );
    });
  });

  describe("pack size calculations", () => {
    function setupForPackSize(litres: number) {
      mockRequisitionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [] });
      mockAnalysisRepo.findOneForJobCard.mockResolvedValue({
        coats: [{ product: "Paint", litersRequired: litres, area: "external" }],
        stockAssessment: [],
      });
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, jobNumber: "JC-001" });
    }

    it("calculates packsToOrder as ceil(litres / 20) for 0.5L", async () => {
      setupForPackSize(0.5);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.buildMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ packsToOrder: 1 })]),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for 21L", async () => {
      setupForPackSize(21);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.buildMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ packsToOrder: 2 })]),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for 68.6L", async () => {
      setupForPackSize(68.6);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.buildMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ packsToOrder: 4 })]),
      );
    });

    it("calculates packsToOrder as ceil(litres / 20) for exact 20L", async () => {
      setupForPackSize(20);
      await service.createFromJobCard(1, 1, "admin");
      expect(mockItemRepo.buildMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ packsToOrder: 1 })]),
      );
    });
  });

  describe("createReorderRequisition", () => {
    it("returns null when stock item not found", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);
      const result = await service.createReorderRequisition(1, 999);
      expect(result).toBeNull();
    });

    it("returns null when minStockLevel is 0", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
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
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
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
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
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
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
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
