import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../audit/audit.service";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { MovementService } from "./movement.service";
import { RequisitionService } from "./requisition.service";

describe("MovementService", () => {
  let service: MovementService;

  const mockStockItemTx = {
    incrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    decrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    setQuantityForCompany: jest.fn().mockResolvedValue(true),
  };

  const mockMovementTx = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
  };

  const mockMovementRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    withTransaction: jest.fn().mockReturnValue(mockMovementTx),
    findFilteredForCompany: jest.fn().mockResolvedValue([]),
    findByItemForCompany: jest.fn().mockResolvedValue([]),
  };

  const mockStockItemRepo = {
    findOneForCompany: jest.fn(),
    withTransaction: jest.fn().mockReturnValue(mockStockItemTx),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementService,
        { provide: StockMovementRepository, useValue: mockMovementRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: TransactionRunner, useValue: mockTxRunner },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MovementService>(MovementService);
    jest.clearAllMocks();
    mockStockItemRepo.withTransaction.mockReturnValue(mockStockItemTx);
    mockMovementRepo.withTransaction.mockReturnValue(mockMovementTx);
    mockTxRunner.run.mockImplementation((work) => work({}));
    mockStockItemTx.decrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemTx.incrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemTx.setQuantityForCompany.mockResolvedValue(true);
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

    it("IN movement atomically increments quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockStockItemTx.incrementQuantityForCompany).toHaveBeenCalledWith(1, 1, 10);
    });

    it("OUT movement atomically decrements quantity", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });

      expect(mockStockItemTx.decrementQuantityForCompany).toHaveBeenCalledWith(1, 1, 10, true);
      expect(mockStockItemTx.setQuantityForCompany).not.toHaveBeenCalled();
    });

    it("OUT movement clamps to 0 when decrement would go negative", async () => {
      const stockItem = { id: 1, quantity: 5, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      mockStockItemTx.decrementQuantityForCompany.mockResolvedValue(false);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 20,
      });

      expect(mockStockItemTx.setQuantityForCompany).toHaveBeenCalledWith(1, 1, 0);
    });

    it("ADJUSTMENT sets quantity directly and atomically", async () => {
      const stockItem = { id: 1, quantity: 50, minStockLevel: 0 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 25,
      });

      expect(mockStockItemTx.setQuantityForCompany).toHaveBeenCalledWith(1, 1, 25);
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

      expect(mockMovementTx.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stockItemId: 1,
          referenceType: ReferenceType.MANUAL,
          notes: "stock take",
        }),
      );
    });
  });

  describe("reorder trigger", () => {
    it("triggers reorder for OUT when refreshed quantity is below minStockLevel", async () => {
      mockStockItemRepo.findOneForCompany
        .mockResolvedValueOnce({ id: 1, quantity: 50, minStockLevel: 45 })
        .mockResolvedValueOnce({ id: 1, quantity: 40, minStockLevel: 45 });

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 10,
      });
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("triggers reorder for ADJUSTMENT when refreshed quantity is below minStockLevel", async () => {
      mockStockItemRepo.findOneForCompany
        .mockResolvedValueOnce({ id: 1, quantity: 50, minStockLevel: 30 })
        .mockResolvedValueOnce({ id: 1, quantity: 10, minStockLevel: 30 });

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.ADJUSTMENT,
        quantity: 10,
      });
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder for IN movement", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
        id: 1,
        quantity: 5,
        minStockLevel: 20,
      });

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.IN,
        quantity: 10,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue({
        id: 1,
        quantity: 0,
        minStockLevel: 0,
      });

      await service.createManualAdjustment(1, {
        stockItemId: 1,
        movementType: MovementType.OUT,
        quantity: 5,
      });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });
  });
});
