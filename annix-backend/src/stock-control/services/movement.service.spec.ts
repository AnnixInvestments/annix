import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementService,
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: RequisitionService, useValue: mockRequisitionService },
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
      mockStockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createManualAdjustment(1, {
          stockItemId: 999,
          movementType: MovementType.IN,
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("IN movement adds to quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 60 }),
      );
    });

    it("OUT movement subtracts from quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 40 }),
      );
    });

    it("OUT movement clamps to 0 (never negative)", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 20,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0 }));
    });

    it("ADJUSTMENT sets quantity directly", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 25,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 25 }),
      );
    });

    it("creates movement record with MANUAL reference type", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
        notes: "stock take",
      });

      expect(mockMovementRepo.create).toHaveBeenCalledWith(
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
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("triggers reorder for ADJUSTMENT when below minStockLevel", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 30 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder for IN movement", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 20 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      const stockItem = { id: 1, quantity: 0, minStockLevel: 0 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 5,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });
  });
});
