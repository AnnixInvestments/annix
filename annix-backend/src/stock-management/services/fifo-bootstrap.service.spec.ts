import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockPurchaseBatch } from "../entities/stock-purchase-batch.entity";
import { FifoBatchService } from "./fifo-batch.service";
import { FifoBootstrapService } from "./fifo-bootstrap.service";

describe("FifoBootstrapService", () => {
  let service: FifoBootstrapService;

  const mockProductRepo = {
    find: jest.fn(),
  };

  const mockBatchRepo = {
    findOne: jest.fn(),
  };

  const mockFifoBatchService = {
    createBatch: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoBootstrapService,
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
        { provide: getRepositoryToken(StockPurchaseBatch), useValue: mockBatchRepo },
        { provide: FifoBatchService, useValue: mockFifoBatchService },
      ],
    }).compile();

    service = module.get<FifoBootstrapService>(FifoBootstrapService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("bootstrapCompany", () => {
    it("creates a legacy batch for each product without an existing one", async () => {
      mockProductRepo.find.mockResolvedValueOnce([
        { id: 1, quantity: 100, costPerUnit: 50 },
        { id: 2, quantity: 50, costPerUnit: 25 },
      ]);
      mockBatchRepo.findOne.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(2);
      expect(result.legacyBatchesSkipped).toBe(0);
      expect(mockFifoBatchService.createBatch).toHaveBeenCalledTimes(2);
    });

    it("skips products that already have a legacy batch", async () => {
      mockProductRepo.find.mockResolvedValueOnce([{ id: 1, quantity: 100, costPerUnit: 50 }]);
      mockBatchRepo.findOne.mockResolvedValueOnce({ id: 99, isLegacyBatch: true });

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(0);
      expect(result.legacyBatchesSkipped).toBe(1);
      expect(mockFifoBatchService.createBatch).not.toHaveBeenCalled();
    });

    it("skips products with zero quantity", async () => {
      mockProductRepo.find.mockResolvedValueOnce([{ id: 1, quantity: 0, costPerUnit: 50 }]);
      mockBatchRepo.findOne.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(0);
      expect(result.legacyBatchesSkipped).toBe(1);
    });

    it("does not call createBatch in dry-run mode", async () => {
      mockProductRepo.find.mockResolvedValueOnce([{ id: 1, quantity: 100, costPerUnit: 50 }]);
      mockBatchRepo.findOne.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1, true);

      expect(result.legacyBatchesCreated).toBe(1);
      expect(mockFifoBatchService.createBatch).not.toHaveBeenCalled();
    });
  });
});
