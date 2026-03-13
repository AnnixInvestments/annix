import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { MovementService } from "./movement.service";
import { RequisitionService } from "./requisition.service";

describe("MovementService", () => {
  let service: MovementService;

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn(),
  };

  const mockStockItemRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data })),
      remove: jest.fn(),
      create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementService,
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<MovementService>(MovementService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createManualAdjustment", () => {
    it("throws NotFoundException when stock item not found", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createManualAdjustment(1, {
          stockItemId: 999,
          movementType: MovementType.IN,
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("IN movement adds to quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 60 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("OUT movement subtracts from quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 40 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("OUT movement clamps to 0 (never negative)", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 20,
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 0 }),
      );
    });

    it("ADJUSTMENT sets quantity directly", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 25,
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 25 }),
      );
    });

    it("creates movement record with MANUAL reference type", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
        notes: "stock take",
      });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          referenceType: ReferenceType.MANUAL,
          notes: "stock take",
        }),
      );
    });
  });

  describe("reorder trigger", () => {
    it("triggers reorder for OUT when below minStockLevel", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 45 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("triggers reorder for ADJUSTMENT when below minStockLevel", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 30 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder for IN movement", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 20 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      const stockItem = { id: 1, quantity: 0, minStockLevel: 0 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 5,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });
  });
});
