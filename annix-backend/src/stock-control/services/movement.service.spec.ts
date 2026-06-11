import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { MovementService } from "./movement.service";
import { RequisitionService } from "./requisition.service";

describe("MovementService", () => {
  let service: MovementService;

  const mockMovementRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    findFilteredForCompany: jest.fn().mockResolvedValue([]),
    findByItemForCompany: jest.fn().mockResolvedValue([]),
  };

  const mockStockItemRepo = {
    findOneForCompany: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementService,
        { provide: StockMovementRepository, useValue: mockMovementRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
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
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);

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
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

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
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

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
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 20,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0 }));
    });

    it("ADJUSTMENT sets quantity directly", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 25,
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 25 }),
      );
    });

    it("creates movement record with MANUAL reference type and scalar stockItemId", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
        notes: "stock take",
      });

      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stockItemId: 1,
          referenceType: ReferenceType.MANUAL,
          notes: "stock take",
        }),
      );
    });
  });

  describe("reorder trigger", () => {
    it("triggers reorder for OUT when below minStockLevel", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 45 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("triggers reorder for ADJUSTMENT when below minStockLevel", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 30 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder for IN movement", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 20 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      const stockItem = { id: 1, quantity: 0, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 5,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });
  });
});
