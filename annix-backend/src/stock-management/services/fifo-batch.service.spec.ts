import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockMovementBatchConsumption } from "../entities/stock-movement-batch-consumption.entity";
import { StockPurchaseBatch } from "../entities/stock-purchase-batch.entity";
import { FifoBatchService } from "./fifo-batch.service";

describe("FifoBatchService", () => {
  let service: FifoBatchService;

  const mockBatchRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        total_quantity: "0",
        total_value: "0",
        legacy_quantity: "0",
        legacy_value: "0",
        active_count: "0",
      }),
    })),
  };

  const mockConsumptionRepo = {
    find: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FifoBatchService,
        { provide: getRepositoryToken(StockPurchaseBatch), useValue: mockBatchRepo },
        {
          provide: getRepositoryToken(StockMovementBatchConsumption),
          useValue: mockConsumptionRepo,
        },
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<FifoBatchService>(FifoBatchService);
    jest.clearAllMocks();
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
      mockProductRepo.findOne.mockResolvedValueOnce(null);
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
      mockProductRepo.findOne.mockResolvedValueOnce({ id: 1 });
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
