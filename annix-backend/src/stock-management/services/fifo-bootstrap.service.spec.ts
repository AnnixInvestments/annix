import { Test, TestingModule } from "@nestjs/testing";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockPurchaseBatchRepository } from "../repositories/stock-purchase-batch.repository";
import { FifoBatchService } from "./fifo-batch.service";
import { FifoBootstrapService } from "./fifo-bootstrap.service";

describe("FifoBootstrapService", () => {
  let service: FifoBootstrapService;

  const mockProductRepo = {
    findActiveForCompany: jest.fn(),
  };

  const mockBatchRepo = {
    findLegacyForProduct: jest.fn(),
  };

  const mockFifoBatchService = {
    createBatch: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoBootstrapService,
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: StockPurchaseBatchRepository, useValue: mockBatchRepo },
        { provide: FifoBatchService, useValue: mockFifoBatchService },
      ],
    }).compile();

    service = module.get<FifoBootstrapService>(FifoBootstrapService);
    jest.clearAllMocks();
    mockFifoBatchService.createBatch.mockResolvedValue({ id: 1 });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("bootstrapCompany", () => {
    it("creates a legacy batch for each product without an existing one", async () => {
      mockProductRepo.findActiveForCompany.mockResolvedValueOnce([
        { id: 1, quantity: 100, costPerUnit: 50 },
        { id: 2, quantity: 50, costPerUnit: 25 },
      ]);
      mockBatchRepo.findLegacyForProduct.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(2);
      expect(result.legacyBatchesSkipped).toBe(0);
      expect(mockFifoBatchService.createBatch).toHaveBeenCalledTimes(2);
    });

    it("skips products that already have a legacy batch", async () => {
      mockProductRepo.findActiveForCompany.mockResolvedValueOnce([
        { id: 1, quantity: 100, costPerUnit: 50 },
      ]);
      mockBatchRepo.findLegacyForProduct.mockResolvedValueOnce({ id: 99, isLegacyBatch: true });

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(0);
      expect(result.legacyBatchesSkipped).toBe(1);
      expect(mockFifoBatchService.createBatch).not.toHaveBeenCalled();
    });

    it("skips products with zero quantity", async () => {
      mockProductRepo.findActiveForCompany.mockResolvedValueOnce([
        { id: 1, quantity: 0, costPerUnit: 50 },
      ]);
      mockBatchRepo.findLegacyForProduct.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1);

      expect(result.legacyBatchesCreated).toBe(0);
      expect(result.legacyBatchesSkipped).toBe(1);
    });

    it("does not call createBatch in dry-run mode", async () => {
      mockProductRepo.findActiveForCompany.mockResolvedValueOnce([
        { id: 1, quantity: 100, costPerUnit: 50 },
      ]);
      mockBatchRepo.findLegacyForProduct.mockResolvedValue(null);

      const result = await service.bootstrapCompany(1, true);

      expect(result.legacyBatchesCreated).toBe(1);
      expect(mockFifoBatchService.createBatch).not.toHaveBeenCalled();
    });
  });
});
