import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { JobCardService } from "./job-card.service";
import { RequisitionService } from "./requisition.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

jest.mock("../../lib/datetime", () => ({
  now: () => ({
    toJSDate: () => new Date("2026-03-13T12:00:00Z"),
    minus: ({ minutes }: { minutes: number }) => ({
      toJSDate: () => new Date(new Date("2026-03-13T12:00:00Z").getTime() - minutes * 60_000),
    }),
  }),
}));

describe("JobCardService", () => {
  let service: JobCardService;

  const mockJobCardRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(null),
  };

  const mockAllocationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockStockItemRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn(),
  };

  const mockCoatingAnalysisRepo = {
    findOne: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  const mockNotificationService = {
    notifyOverAllocationApproval: jest.fn().mockResolvedValue(null),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(null),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data })),
      create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCardService,
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(StockAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(JobCardCoatingAnalysis), useValue: mockCoatingAnalysisRepo },
        {
          provide: getRepositoryToken(JobCardJobFile),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<JobCardService>(JobCardService);
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a job card with company id", async () => {
      const data = { jobNumber: "JC-001", description: "Test job" };
      const result = await service.create(1, data);

      expect(mockJobCardRepo.create).toHaveBeenCalledWith({ ...data, companyId: 1 });
      expect(mockJobCardRepo.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ companyId: 1, jobNumber: "JC-001" }));
    });
  });

  describe("findAll", () => {
    it("returns job cards for company", async () => {
      const cards = [{ id: 1, companyId: 1 }];
      mockJobCardRepo.find.mockResolvedValue(cards);

      const result = await service.findAll(1);
      expect(result).toEqual(cards);
      expect(mockJobCardRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 1 }),
          order: { createdAt: "DESC" },
          take: 50,
          skip: 0,
        }),
      );
    });

    it("filters by status when provided", async () => {
      mockJobCardRepo.find.mockResolvedValue([]);

      await service.findAll(1, "active");
      expect(mockJobCardRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 1, status: "active" }),
        }),
      );
    });

    it("paginates correctly", async () => {
      mockJobCardRepo.find.mockResolvedValue([]);

      await service.findAll(1, null as unknown as string, 3, 10);
      expect(mockJobCardRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe("findById", () => {
    it("returns job card with relations", async () => {
      const card = { id: 1, companyId: 1 };
      mockJobCardRepo.findOne.mockResolvedValue(card);

      const result = await service.findById(1, 1);
      expect(result).toEqual(card);
    });

    it("throws NotFoundException when not found", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("updates and saves job card", async () => {
      const existing = { id: 1, companyId: 1, jobNumber: "JC-001", description: "Old" };
      mockJobCardRepo.findOne.mockResolvedValue(existing);

      await service.update(1, 1, { description: "Updated" });
      expect(mockJobCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Updated" }),
      );
    });

    it("throws NotFoundException when job card missing", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, 999, { description: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("removes the job card", async () => {
      const card = { id: 1, companyId: 1 };
      mockJobCardRepo.findOne.mockResolvedValue(card);

      await service.remove(1, 1);
      expect(mockJobCardRepo.remove).toHaveBeenCalledWith(card);
    });

    it("throws NotFoundException when job card missing", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("allocateStock", () => {
    const allocationData = {
      stockItemId: 10,
      jobCardId: 1,
      quantityUsed: 5,
      allocatedBy: "admin",
    };

    it("deducts stock and creates allocation and movement", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue(null);

      const result = await service.allocateStock(1, allocationData);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 95 }),
      );
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 5,
          referenceType: ReferenceType.ALLOCATION,
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when stock item not found", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.allocateStock(1, allocationData)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("throws NotFoundException when job card not found", async () => {
      const stockItem = { id: 10, quantity: 100, companyId: 1 };
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(stockItem).mockResolvedValueOnce(null);

      await expect(service.allocateStock(1, allocationData)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("throws BadRequestException when insufficient stock", async () => {
      const stockItem = { id: 10, quantity: 2, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);

      await expect(
        service.allocateStock(1, { ...allocationData, quantityUsed: 10 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("triggers reorder requisition when stock drops below minimum", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 20, minStockLevel: 18, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 10);
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 10, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("logs audit entry after allocation", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "stock_allocation",
          newValues: expect.objectContaining({ stockItemId: 10, quantity: 5 }),
        }),
      );
    });
  });

  describe("allocateStock - over-allocation", () => {
    const allocationData = {
      stockItemId: 10,
      jobCardId: 1,
      quantityUsed: 15,
      allocatedBy: "admin",
    };

    it("flags pending approval when exceeding allowed litres", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 10 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockAllocation,
        expect.objectContaining({ pendingApproval: true }),
      );
      expect(mockNotificationService.notifyOverAllocationApproval).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("does not deduct stock when allocation requires approval", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 10 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockQueryRunner.manager.save).not.toHaveBeenCalledWith(StockItem, expect.anything());
    });

    it("accounts for existing allocations when checking over-allocation", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 20 }],
      });
      mockAllocationRepo.find.mockResolvedValue([{ quantityUsed: 10 }]);

      await service.allocateStock(1, { ...allocationData, quantityUsed: 11 });

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockAllocation,
        expect.objectContaining({ pendingApproval: true }),
      );
    });

    it("allows allocation within limit even with existing allocations", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 20 }],
      });
      mockAllocationRepo.find.mockResolvedValue([{ quantityUsed: 5 }]);

      await service.allocateStock(1, { ...allocationData, quantityUsed: 10 });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 90 }),
      );
      expect(mockNotificationService.notifyOverAllocationApproval).not.toHaveBeenCalled();
    });

    it("skips over-allocation check when no coating analysis exists", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 85 }),
      );
    });

    it("skips over-allocation check when no fuzzy match for stock item name", async () => {
      const stockItem = {
        id: 10,
        name: "Completely Different Product",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem)
        .mockResolvedValueOnce(jobCard);
      mockCoatingAnalysisRepo.findOne.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 5 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 85 }),
      );
    });
  });

  describe("approveOverAllocation", () => {
    it("approves pending allocation and deducts stock", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        pendingApproval: true,
        quantityUsed: 10,
        stockItem: { id: 10 },
        jobCard: { id: 1, jobNumber: "JC-001" },
        allocatedBy: "admin",
      };
      const stockItem = { id: 10, quantity: 50, minStockLevel: 0, companyId: 1 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(allocation)
        .mockResolvedValueOnce(stockItem);

      const result = await service.approveOverAllocation(1, 5, 99);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 40 }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockAllocation,
        expect.objectContaining({
          pendingApproval: false,
          approvedByManagerId: 99,
        }),
      );
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 10,
          referenceType: ReferenceType.ALLOCATION,
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when pending allocation not found", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.approveOverAllocation(1, 999, 99)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("throws NotFoundException when stock item disappears", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItem: { id: 10 },
        jobCard: { id: 1, jobNumber: "JC-001" },
      };
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(allocation).mockResolvedValueOnce(null);

      await expect(service.approveOverAllocation(1, 5, 99)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("throws BadRequestException when stock now insufficient", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItem: { id: 10 },
        jobCard: { id: 1, jobNumber: "JC-001" },
      };
      const stockItem = { id: 10, quantity: 5, companyId: 1 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(allocation)
        .mockResolvedValueOnce(stockItem);

      await expect(service.approveOverAllocation(1, 5, 99)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("triggers reorder if stock drops below minimum after approval", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItem: { id: 10 },
        jobCard: { id: 1, jobNumber: "JC-001" },
        allocatedBy: "admin",
      };
      const stockItem = { id: 10, quantity: 15, minStockLevel: 10, companyId: 1 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(allocation)
        .mockResolvedValueOnce(stockItem);

      await service.approveOverAllocation(1, 5, 99);

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 10);
    });
  });

  describe("rejectOverAllocation", () => {
    it("marks allocation as rejected with reason", async () => {
      const allocation = { id: 5, companyId: 1, pendingApproval: true };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      const result = await service.rejectOverAllocation(1, 5, "Exceeds budget");

      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingApproval: false,
          rejectionReason: "Exceeds budget",
        }),
      );
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when pending allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectOverAllocation(1, 999, "reason")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("undoAllocation", () => {
    const user = { id: 1, name: "Admin User" };

    it("restores stock quantity and marks allocation as undone", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItem: { id: 10 },
        jobCard: { id: 1 },
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      const result = await service.undoAllocation(1, 5, user);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 50 }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockAllocation,
        expect.objectContaining({
          undone: true,
          undoneByName: "Admin User",
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.undone).toBe(true);
    });

    it("creates reverse IN movement", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItem: { id: 10 },
        jobCard: { id: 1 },
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.undoAllocation(1, 5, user);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.IN,
          quantity: 10,
          referenceType: ReferenceType.ALLOCATION,
          referenceId: 5,
        }),
      );
    });

    it("throws NotFoundException when allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.undoAllocation(1, 999, user)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when already undone", async () => {
      const allocation = {
        id: 5,
        undone: true,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when allocation is pending approval", async () => {
      const allocation = {
        id: 5,
        undone: false,
        pendingApproval: true,
        createdAt: new Date("2026-03-13T11:58:00Z"),
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(BadRequestException);
    });

    it("rolls back transaction on failure", async () => {
      const allocation = {
        id: 5,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItem: { id: 10 },
        jobCard: { id: 1 },
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("logs audit entry on successful undo", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItem: { id: 10 },
        jobCard: { id: 1 },
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.undoAllocation(1, 5, user);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "stock_allocation",
          entityId: 5,
          newValues: expect.objectContaining({ undoneBy: "Admin User" }),
        }),
      );
    });
  });

  describe("pendingAllocations", () => {
    it("returns pending allocations for company", async () => {
      const pending = [{ id: 1, pendingApproval: true }];
      mockAllocationRepo.find.mockResolvedValue(pending);

      const result = await service.pendingAllocations(1);
      expect(result).toEqual(pending);
    });
  });

  describe("allocationsByJobCard", () => {
    it("returns allocations for a specific job card", async () => {
      const allocations = [{ id: 1, jobCard: { id: 5 } }];
      mockAllocationRepo.find.mockResolvedValue(allocations);

      const result = await service.allocationsByJobCard(1, 5);
      expect(result).toEqual(allocations);
    });
  });

  describe("uploadAllocationPhoto", () => {
    it("uploads photo and updates allocation", async () => {
      const allocation = { id: 5, companyId: 1, photoUrl: null, stockItem: { id: 10 } };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStorageService.upload.mockResolvedValue({ url: "https://s3.example.com/photo.jpg" });

      const file = {
        buffer: Buffer.from("test"),
        originalname: "photo.jpg",
      } as Express.Multer.File;
      await service.uploadAllocationPhoto(1, 5, file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(file, "stock-control/allocations");
      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "https://s3.example.com/photo.jpg" }),
      );
    });

    it("throws NotFoundException when allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      const file = { buffer: Buffer.from("test") } as Express.Multer.File;
      await expect(service.uploadAllocationPhoto(1, 999, file)).rejects.toThrow(NotFoundException);
    });
  });
});
