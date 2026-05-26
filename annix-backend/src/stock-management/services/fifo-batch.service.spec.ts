import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockMovementBatchConsumptionRepository } from "../repositories/stock-movement-batch-consumption.repository";
import { StockPurchaseBatchRepository } from "../repositories/stock-purchase-batch.repository";
import { FifoBatchService } from "./fifo-batch.service";

describe("FifoBatchService", () => {
  let service: FifoBatchService;

  const mockBatchRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    withTransaction: jest.fn(),
    findActiveForProductLocked: jest.fn().mockResolvedValue([]),
    valuationForProduct: jest.fn().mockResolvedValue({
      totalQuantity: 0,
      totalValueR: 0,
      legacyQuantity: 0,
      legacyValueR: 0,
      activeBatchCount: 0,
    }),
    valuationForCompany: jest.fn().mockResolvedValue({
      totalValueR: 0,
      legacyValueR: 0,
      activeBatchCount: 0,
    }),
    findForProduct: jest.fn().mockResolvedValue([]),
    findLegacyForProduct: jest.fn(),
  };

  const mockConsumptionRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    withTransaction: jest.fn(),
    findHistoryForProduct: jest.fn().mockResolvedValue([]),
  };

  const mockProductRepo = {
    findByIdForCompany: jest.fn(),
    findNameSkuForProduct: jest.fn(),
    withTransaction: jest.fn(),
  };

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoBatchService,
        { provide: StockPurchaseBatchRepository, useValue: mockBatchRepo },
        { provide: StockMovementBatchConsumptionRepository, useValue: mockConsumptionRepo },
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: TransactionRunner, useValue: mockTxRunner },
      ],
    }).compile();

    service = module.get<FifoBatchService>(FifoBatchService);
    jest.clearAllMocks();
    mockBatchRepo.build.mockImplementation((data) => ({ ...data }));
    mockBatchRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockBatchRepo.withTransaction.mockReturnValue(mockBatchRepo);
    mockConsumptionRepo.build.mockImplementation((data) => ({ ...data }));
    mockConsumptionRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockConsumptionRepo.withTransaction.mockReturnValue(mockConsumptionRepo);
    mockProductRepo.withTransaction.mockReturnValue(mockProductRepo);
    mockTxRunner.run.mockImplementation((work) => work({}));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createBatch", () => {
    it("rejects zero or negative quantities", async () => {
      await expect(
        service.createBatch(1, {
          productId: 1,
          sourceType: "supplier_invoice",
          quantityPurchased: 0,
          costPerUnit: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects negative cost per unit", async () => {
      await expect(
        service.createBatch(1, {
          productId: 1,
          sourceType: "supplier_invoice",
          quantityPurchased: 10,
          costPerUnit: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when product does not exist", async () => {
      mockProductRepo.findByIdForCompany.mockResolvedValueOnce(null);
      await expect(
        service.createBatch(1, {
          productId: 999,
          sourceType: "supplier_invoice",
          quantityPurchased: 10,
          costPerUnit: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("creates a batch with computed totalCostR and remaining = purchased", async () => {
      mockProductRepo.findByIdForCompany.mockResolvedValueOnce({ id: 1 });
      const result = await service.createBatch(1, {
        productId: 1,
        sourceType: "supplier_invoice",
        quantityPurchased: 10,
        costPerUnit: 100,
      });
      expect(result).toMatchObject({
        quantityPurchased: 10,
        quantityRemaining: 10,
        costPerUnit: 100,
        totalCostR: 1000,
        status: "active",
      });
    });
  });

  describe("consumeFifo", () => {
    it("rejects zero or negative quantities", async () => {
      await expect(
        service.consumeFifo(1, {
          productId: 1,
          movementKind: "issuance",
          quantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
